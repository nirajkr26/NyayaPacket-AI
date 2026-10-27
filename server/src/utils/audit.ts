import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog';

interface AuditLogOptions {
  actorId?: mongoose.Types.ObjectId | string | null;
  role?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(
  action: string,
  options: AuditLogOptions = {}
): Promise<void> {
  try {
    let actorObjectId: mongoose.Types.ObjectId | null = null;
    if (options.actorId) {
      if (typeof options.actorId === 'string' && mongoose.Types.ObjectId.isValid(options.actorId)) {
        actorObjectId = new mongoose.Types.ObjectId(options.actorId);
      } else if (options.actorId instanceof mongoose.Types.ObjectId) {
        actorObjectId = options.actorId;
      }
    }

    await AuditLog.create({
      action,
      actorId: actorObjectId,
      role: options.role || 'anonymous',
      ip: options.ip || 'unknown',
      metadata: options.metadata || {},
    });
  } catch (error) {
    // Non-blocking: write errors should not crash the core user journey
    console.error('AuditLog write failure:', error);
  }
}
