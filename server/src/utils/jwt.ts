import jwt from 'jsonwebtoken';
import { IUser, UserRole } from '../models/User';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  email: string;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'nyayapacket_default_jwt_secret_key_development';
}

export function signToken(user: IUser): string {
  const payload: TokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(payload, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
