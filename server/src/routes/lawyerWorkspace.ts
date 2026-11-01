import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";

export const lawyerWorkspaceRouter = Router();

lawyerWorkspaceRouter.use(authenticate);

/**
 * GET /api/v1/lawyers/me/shared-cases
 * List all cases shared with the current lawyer via active access grants
 */
lawyerWorkspaceRouter.get("/me/shared-cases", async (req, res) => {
  const user = req.user!;

  try {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return sendError(res, "NOT_A_LAWYER", "User is not registered as an advocate", 403);
    }

    const now = new Date();
    const activeGrants = await prisma.accessGrant.findMany({
      where: {
        lawyerProfileId: profile.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        case: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            owner: { select: { id: true, fullName: true, email: true, phone: true } },
            parties: true,
          },
        },
      },
      orderBy: { grantedAt: "desc" },
    });

    const sharedCases = activeGrants.map((grant) => ({
      grantId: grant.id,
      grantedAt: grant.grantedAt,
      expiresAt: grant.expiresAt,
      permissions: {
        canViewSummary: grant.canViewSummary,
        canViewEvidence: grant.canViewEvidence,
        canDownload: grant.canDownload,
      },
      case: grant.case,
    }));

    return sendSuccess(res, sharedCases);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/lawyers/me/shared-cases/:id
 * Retrieve shared case workspace view with authorization checks
 */
lawyerWorkspaceRouter.get("/me/shared-cases/:id", async (req, res) => {
  const user = req.user!;
  const caseId = req.params["id"] as string;

  try {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return sendError(res, "NOT_A_LAWYER", "User is not registered as an advocate", 403);
    }

    const now = new Date();
    const grant = await prisma.accessGrant.findFirst({
      where: {
        caseId,
        lawyerProfileId: profile.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    if (!grant) {
      return sendError(res, "CASE_ACCESS_DENIED", "No active access grant for this case", 403);
    }

    const caseDetails = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        category: true,
        owner: { select: { id: true, fullName: true, email: true, phone: true } },
        parties: true,
        timelineEvents: {
          orderBy: { eventDate: "asc" },
        },
        actionItems: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!caseDetails) {
      return sendError(res, "CASE_NOT_FOUND", "Case not found", 404);
    }

    return sendSuccess(res, {
      case: caseDetails,
      permissions: {
        canViewSummary: grant.canViewSummary,
        canViewEvidence: grant.canViewEvidence,
        canDownload: grant.canDownload,
      },
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
