import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/rbac.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import { logAuditEvent } from "../services/audit/auditLogger.js";
import { evidenceQueue } from "../queues/evidenceQueue.js";
import { aiAnalysisQueue } from "../queues/aiAnalysisQueue.js";
import { pdfQueue } from "../queues/pdfQueue.js";
import { clearUserCache } from "../services/auth/userProvisioner.js";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

const userStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().optional(),
});

/**
 * GET /api/v1/admin/dashboard/metrics
 * System-wide statistics across users, cases, consultations, and packets
 */
adminRouter.get("/dashboard/metrics", async (_req, res) => {
  try {
    const [
      totalUsers,
      citizensCount,
      lawyersCount,
      adminsCount,
      activeUsersCount,
      totalCases,
      casesByStatus,
      totalConsultations,
      consultationsByStatus,
      totalPackets,
      lawyerVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.CITIZEN } }),
      prisma.user.count({ where: { role: UserRole.LAWYER } }),
      prisma.user.count({ where: { role: UserRole.ADMIN } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.case.count(),
      prisma.case.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.consultationRequest.count(),
      prisma.consultationRequest.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.packetGeneration.count(),
      prisma.lawyerProfile.groupBy({ by: ["verificationStatus"], _count: { id: true } }),
    ]);

    return sendSuccess(res, {
      users: {
        total: totalUsers,
        citizens: citizensCount,
        lawyers: lawyersCount,
        admins: adminsCount,
        active: activeUsersCount,
        suspended: totalUsers - activeUsersCount,
      },
      cases: {
        total: totalCases,
        byStatus: Object.fromEntries(casesByStatus.map((c) => [c.status, c._count.id])),
      },
      consultations: {
        total: totalConsultations,
        byStatus: Object.fromEntries(
          consultationsByStatus.map((c) => [c.status, c._count.id])
        ),
      },
      packets: {
        total: totalPackets,
      },
      lawyerVerifications: Object.fromEntries(
        lawyerVerifications.map((l) => [l.verificationStatus, l._count.id])
      ),
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/admin/users
 * User directory with filtering and pagination
 */
adminRouter.get("/users", async (req, res) => {
  const page = Math.max(1, parseInt(req.query["page"] as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string, 10) || 20));
  const skip = (page - 1) * limit;

  const role = req.query["role"] as UserRole | undefined;
  const search = req.query["search"] as string | undefined;
  const isActive =
    req.query["isActive"] !== undefined ? req.query["isActive"] === "true" : undefined;

  const where: any = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          authUserId: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          lawyerProfile: {
            select: {
              id: true,
              barCouncilNumber: true,
              verificationStatus: true,
            },
          },
          _count: {
            select: { cases: true, consultationRequests: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return sendSuccess(res, users, "Users retrieved", 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * Suspend or reactivate user account
 */
adminRouter.patch("/users/:id/status", async (req, res) => {
  const targetUserId = req.params["id"] as string;
  const admin = req.user!;

  if (targetUserId === admin.id) {
    return sendError(res, "INVALID_OPERATION", "Cannot suspend own admin account", 400);
  }

  const parse = userStatusSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid status payload", 400, parse.error.format());
  }

  const { isActive, reason } = parse.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return sendError(res, "USER_NOT_FOUND", "Target user not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, fullName: true, email: true, role: true, isActive: true },
    });

    clearUserCache(user.authUserId);

    // Write audit log
    await logAuditEvent({
      actorId: admin.id,
      action: isActive ? "REACTIVATE_USER" : "SUSPEND_USER",
      resourceType: "User",
      resourceId: targetUserId,
      metadata: {
        reason: reason || (isActive ? "Account reactivated by admin" : "Account suspended by admin"),
        targetEmail: user.email,
        targetRole: user.role,
      },
    });

    return sendSuccess(
      res,
      updated,
      `User account ${isActive ? "reactivated" : "suspended"} successfully`
    );
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/admin/cases
 * Case metadata monitoring with Admin Privacy Guard (no evidence files or raw transcripts)
 */
adminRouter.get("/cases", async (req, res) => {
  const page = Math.max(1, parseInt(req.query["page"] as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string, 10) || 20));
  const skip = (page - 1) * limit;

  try {
    const [total, cases] = await Promise.all([
      prisma.case.count(),
      prisma.case.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          caseNumber: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          category: { select: { name: true, slug: true } },
          owner: { select: { id: true, fullName: true, email: true } },
          _count: {
            select: { evidence: true, packets: true, consultationRequests: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return sendSuccess(res, cases, "Case metadata retrieved", 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * System audit log explorer
 */
adminRouter.get("/audit-logs", async (req, res) => {
  const page = Math.max(1, parseInt(req.query["page"] as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query["limit"] as string, 10) || 25));
  const skip = (page - 1) * limit;

  const action = req.query["action"] as string | undefined;
  const resourceType = req.query["resourceType"] as string | undefined;

  const where: any = {};
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;

  try {
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return sendSuccess(res, logs, "Audit logs retrieved", 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/admin/queues/status
 * BullMQ background processing queue status
 */
adminRouter.get("/queues/status", async (_req, res) => {
  try {
    const [evidenceCounts, aiCounts, pdfCounts] = await Promise.all([
      evidenceQueue.getJobCounts("waiting", "active", "completed", "failed"),
      aiAnalysisQueue.getJobCounts("waiting", "active", "completed", "failed"),
      pdfQueue.getJobCounts("waiting", "active", "completed", "failed"),
    ]);

    return sendSuccess(res, {
      evidenceQueue: evidenceCounts,
      aiAnalysisQueue: aiCounts,
      pdfQueue: pdfCounts,
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
