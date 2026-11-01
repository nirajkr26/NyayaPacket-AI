import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { sendSuccess } from "../utils/response.js";

export const authRouter = Router();

function getRolePermissions(role: string): string[] {
  switch (role) {
    case "CITIZEN":
      return [
        "CASE_CREATE",
        "CASE_READ_OWN",
        "EVIDENCE_UPLOAD",
        "TIMELINE_VERIFY",
        "PACKET_GENERATE",
        "LAWYER_DISCOVERY",
        "CONSULTATION_CREATE",
        "GRANT_MANAGE",
      ];
    case "LAWYER":
      return [
        "LAWYER_PROFILE_MANAGE",
        "CONSULTATION_MANAGE",
        "SHARED_CASE_READ",
        "COMMENT_CREATE",
        "ACTION_PLAN_MANAGE",
      ];
    case "ADMIN":
      return [
        "LAWYER_VERIFICATION_MANAGE",
        "USER_MANAGE",
        "CASE_METADATA_READ",
        "AUDIT_LOG_READ",
        "PLATFORM_SETTINGS_MANAGE",
      ];
    default:
      return [];
  }
}

/**
 * GET /api/v1/auth/me
 * Returns currently authenticated user context, application role, and permissions
 */
authRouter.get("/me", authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const permissions = getRolePermissions(user.role);

    const data: Record<string, any> = {
      id: user.id,
      authUserId: user.authUserId,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      isActive: user.isActive,
      profileComplete: Boolean(user.fullName && user.email),
      permissions,
      createdAt: user.createdAt,
    };

    if (user.role === "LAWYER" && user.lawyerProfile) {
      data.lawyerProfile = {
        id: user.lawyerProfile.id,
        barCouncilNumber: user.lawyerProfile.barCouncilNumber,
        stateBarCouncil: user.lawyerProfile.stateBarCouncil,
        verificationStatus: user.lawyerProfile.verificationStatus,
        isListed: user.lawyerProfile.isListed,
        isAvailable: user.lawyerProfile.isAvailable,
      };
    }

    return sendSuccess(res, data, "User profile retrieved successfully");
  } catch (err) {
    next(err);
  }
});
