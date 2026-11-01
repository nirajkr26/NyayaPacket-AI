import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any> | null;
}

export async function logAuditEvent(params: CreateAuditLogParams) {
  try {
    const record = await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: params.metadata || {},
      },
    });
    logger.info(
      {
        auditId: record.id,
        action: params.action,
        actorId: params.actorId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
      },
      "Security audit event logged"
    );
    return record;
  } catch (err: any) {
    logger.error({ err: err.message, params }, "Failed to write audit log entry");
    // Do not throw to avoid crashing the user transaction if audit log write fails, but report
    return null;
  }
}
