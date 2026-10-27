import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { authenticate } from '../middleware/auth';
import { signToken } from '../utils/jwt';
import { logAudit } from '../utils/audit';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['citizen', 'lawyer']),
  barCouncilId: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function sanitizeUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    barCouncilId: user.barCouncilId,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      message: parseResult.error.errors[0]?.message || 'Invalid input data',
      errors: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, password, role, barCouncilId } = parseResult.data;

  // Check email uniqueness
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400).json({ message: 'Email already registered. Please log in.' });
    return;
  }

  // Hash password with bcrypt cost 10
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    barCouncilId: role === 'lawyer' ? barCouncilId : undefined,
    isActive: true,
  });

  // Issue JWT cookie
  const token = signToken(newUser);
  setAuthCookie(res, token);

  // Write AuditLog
  await logAudit('auth.register', {
    actorId: newUser._id,
    role: newUser.role,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    metadata: { email: newUser.email, role: newUser.role },
  });

  res.status(201).json({
    message: 'Registration successful',
    user: sanitizeUser(newUser),
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      message: 'Invalid email or password format',
    });
    return;
  }

  const { email, password } = parseResult.data;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    await logAudit('auth.login.failed', {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      metadata: { attemptedEmail: email, reason: 'user_not_found' },
    });
    // Single generic message: never reveal which part was wrong
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  if (!user.isActive) {
    await logAudit('auth.login.failed', {
      actorId: user._id,
      role: user.role,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      metadata: { reason: 'account_inactive' },
    });
    res.status(401).json({ message: 'Your account is inactive. Please contact support.' });
    return;
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    await logAudit('auth.login.failed', {
      actorId: user._id,
      role: user.role,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      metadata: { reason: 'invalid_password' },
    });
    // Single generic message
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const token = signToken(user);
  setAuthCookie(res, token);

  await logAudit('auth.login.success', {
    actorId: user._id,
    role: user.role,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
  });

  res.status(200).json({
    message: 'Login successful',
    user: sanitizeUser(user),
  });
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  // If user is currently authenticated via token, record their actorId
  const token = req.cookies?.token;
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  await logAudit('auth.logout', {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    metadata: { hadSessionCookie: Boolean(token) },
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  res.status(200).json({ user: sanitizeUser(req.user) });
});

export default router;
