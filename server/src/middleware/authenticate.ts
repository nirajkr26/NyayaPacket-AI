import type { Request, Response, NextFunction } from "express";
import { verifyNeonJwt } from "../services/auth/tokenVerifier.js";
import { getOrProvisionUser } from "../services/auth/userProvisioner.js";
import type { AuthUserWithProfile } from "../services/auth/userProvisioner.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserWithProfile;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication required. Please provide a Bearer token.");
    }

    const token = authHeader.split(" ")[1]?.trim();
    if (!token) {
      throw new UnauthorizedError("Invalid or empty Bearer token");
    }

    // 1. Cryptographically verify token
    const payload = await verifyNeonJwt(token);

    // 2. Resolve or provision PostgreSQL user
    const user = await getOrProvisionUser(payload);

    // 3. Enforce account status check
    if (!user.isActive) {
      throw new ForbiddenError(
        "Your account has been suspended or deactivated. Please contact support.",
        "ACCOUNT_SUSPENDED"
      );
    }

    // 4. Attach trusted database user context to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
