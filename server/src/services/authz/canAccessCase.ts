import { UserRole, LawyerVerificationStatus } from "@prisma/client";
import type { User, LawyerProfile } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type PermissionScope =
  | "VIEW_CASE_SUMMARY"
  | "VIEW_TIMELINE"
  | "VIEW_EVIDENCE"
  | "DOWNLOAD_EVIDENCE"
  | "VIEW_VERIFICATION_HISTORY"
  | "COMMENT_ON_CASE"
  | "REQUEST_INFORMATION"
  | "MANAGE_ACTION_ITEMS";

export interface AccessCheckResult {
  allowed: boolean;
  code?: string;
  reason?: string;
  statusCode?: number;
  caseData?: {
    id: string;
    caseNumber: string;
    ownerId: string;
    status: string;
  };
}

export async function canAccessCase(params: {
  user: User & { lawyerProfile?: LawyerProfile | null };
  caseId: string;
  scope: PermissionScope;
}): Promise<AccessCheckResult> {
  const { user, caseId, scope } = params;

  // 1. Verify User exists and is active
  if (!user || !user.isActive) {
    return {
      allowed: false,
      code: "ACCOUNT_SUSPENDED",
      reason: "User account is suspended or inactive",
      statusCode: 403,
    };
  }

  // 2. Retrieve Target Case
  const targetCase = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      caseNumber: true,
      ownerId: true,
      status: true,
    },
  });

  if (!targetCase) {
    return {
      allowed: false,
      code: "CASE_NOT_FOUND",
      reason: "Case not found",
      statusCode: 404,
    };
  }

  // 3. Citizen Ownership Policy
  if (user.role === UserRole.CITIZEN) {
    if (targetCase.ownerId === user.id) {
      return { allowed: true, caseData: targetCase };
    }
    return {
      allowed: false,
      code: "CASE_ACCESS_DENIED",
      reason: "Citizens may only access their own legal cases",
      statusCode: 403,
    };
  }

  // 4. Lawyer Scoped Access Grant Policy
  if (user.role === UserRole.LAWYER) {
    const profile = user.lawyerProfile;
    if (!profile || profile.verificationStatus !== LawyerVerificationStatus.APPROVED) {
      return {
        allowed: false,
        code: "LAWYER_NOT_APPROVED",
        reason: "Only approved lawyers may access shared citizen cases",
        statusCode: 403,
      };
    }

    // Query active, non-revoked, unexpired grant
    const now = new Date();
    const grant = await prisma.accessGrant.findFirst({
      where: {
        caseId: targetCase.id,
        lawyerProfileId: profile.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (!grant) {
      // Check if there was a revoked grant
      const revokedGrant = await prisma.accessGrant.findFirst({
        where: {
          caseId: targetCase.id,
          lawyerProfileId: profile.id,
          revokedAt: { not: null },
        },
      });

      if (revokedGrant) {
        return {
          allowed: false,
          code: "GRANT_REVOKED",
          reason: "Access to this case has been revoked by the citizen",
          statusCode: 403,
        };
      }

      // Check if there was an expired grant
      const expiredGrant = await prisma.accessGrant.findFirst({
        where: {
          caseId: targetCase.id,
          lawyerProfileId: profile.id,
          expiresAt: { lte: now },
        },
      });

      if (expiredGrant) {
        return {
          allowed: false,
          code: "GRANT_EXPIRED",
          reason: "Access grant for this case has expired",
          statusCode: 403,
        };
      }

      return {
        allowed: false,
        code: "CASE_ACCESS_DENIED",
        reason: "No active access grant exists for this lawyer and case",
        statusCode: 403,
      };
    }

    // Enforce granular permission scopes against grant flags
    if (scope === "DOWNLOAD_EVIDENCE" && !grant.canDownload) {
      return {
        allowed: false,
        code: "DOWNLOAD_NOT_PERMITTED",
        reason: "Citizen has not granted file download permission for this case",
        statusCode: 403,
      };
    }

    if (scope === "VIEW_EVIDENCE" && !grant.canViewEvidence) {
      return {
        allowed: false,
        code: "EVIDENCE_VIEW_RESTRICTED",
        reason: "Evidence viewing is not permitted under current grant",
        statusCode: 403,
      };
    }

    if (scope === "VIEW_CASE_SUMMARY" && !grant.canViewSummary) {
      return {
        allowed: false,
        code: "SUMMARY_VIEW_RESTRICTED",
        reason: "Summary viewing is not permitted under current grant",
        statusCode: 403,
      };
    }

    return { allowed: true, caseData: targetCase };
  }

  // 5. Admin Privacy Guard Policy
  if (user.role === UserRole.ADMIN) {
    // Admins are strictly prohibited from viewing or downloading citizen evidence by default
    if (scope === "VIEW_EVIDENCE" || scope === "DOWNLOAD_EVIDENCE") {
      return {
        allowed: false,
        code: "ADMIN_EVIDENCE_RESTRICTED",
        reason: "Platform Administrators are restricted from accessing citizen legal evidence",
        statusCode: 403,
      };
    }
    return { allowed: true, caseData: targetCase };
  }

  return {
    allowed: false,
    code: "UNAUTHORIZED_ROLE",
    reason: "Role not recognized for case access",
    statusCode: 403,
  };
}
