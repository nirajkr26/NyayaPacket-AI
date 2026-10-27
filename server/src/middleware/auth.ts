import { Request, Response, NextFunction } from 'express';
import { User, IUser, UserRole } from '../models/User';
import { verifyToken, signToken } from '../utils/jwt';
import { logAudit } from '../utils/audit';

// Augment express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const signAuthToken = (user: IUser): string => signToken(user);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ message: 'Authentication required. Please log in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    return;
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ message: 'User account not found.' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'Your account is inactive. Please contact support.' });
      return;
    }

    // Role is always bound to the real database user record
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Internal authentication error.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Deny by default: user must be authenticated
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    // Role check comes strictly from DB user attached to req.user
    if (!roles.includes(req.user.role)) {
      // Audit log the 403 access denial
      await logAudit('access.denied', {
        actorId: req.user._id,
        role: req.user.role,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        metadata: {
          path: req.originalUrl,
          requiredRoles: roles,
          userRole: req.user.role,
        },
      });

      res.status(403).json({
        message: 'Access forbidden: you do not have permission to view this resource.',
        requiredRoles: roles,
      });
      return;
    }

    next();
  };
}
