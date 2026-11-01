import type { Request, Response, NextFunction } from "express";
import { UserRole, LawyerVerificationStatus } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

/**
 * Middleware: Requires the user to have an active account status
 */
export function requireActiveUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }
  if (!req.user.isActive) {
    return next(new ForbiddenError("Account is suspended or deactivated", "ACCOUNT_SUSPENDED"));
  }
  next();
}

/**
 * Middleware: Restricts route to specific application roles
 */
export function allowRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]`,
          "ROLE_UNAUTHORIZED"
        )
      );
    }
    next();
  };
}

/**
 * Middleware: Requires the authenticated user to be an APPROVED lawyer
 */
export function requireApprovedLawyer(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }
  if (req.user.role !== UserRole.LAWYER) {
    return next(new ForbiddenError("Access restricted to lawyers only", "ROLE_UNAUTHORIZED"));
  }

  const profile = req.user.lawyerProfile;
  if (!profile) {
    return next(new ForbiddenError("Lawyer profile not initialized", "LAWYER_PROFILE_MISSING"));
  }

  if (profile.verificationStatus !== LawyerVerificationStatus.APPROVED) {
    return next(
      new ForbiddenError(
        `Lawyer account verification is ${profile.verificationStatus}. Only approved lawyers may perform this action.`,
        "LAWYER_NOT_APPROVED"
      )
    );
  }

  next();
}

/**
 * Middleware: Requires the authenticated user to be a Platform Administrator
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }
  if (req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError("Administrator access required", "ADMIN_REQUIRED"));
  }
  next();
}
