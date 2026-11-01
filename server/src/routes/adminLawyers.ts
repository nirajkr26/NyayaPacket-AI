import { Router } from "express";
import { z } from "zod";
import {
  LawyerVerificationStatus,
  VerificationDocumentStatus,
} from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/rbac.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import { logAuditEvent } from "../services/audit/auditLogger.js";

export const adminLawyersRouter = Router();

adminLawyersRouter.use(authenticate);
adminLawyersRouter.use(requireAdmin);

const verificationDecisionSchema = z.object({
  status: z.enum([
    LawyerVerificationStatus.APPROVED,
    LawyerVerificationStatus.REJECTED,
    LawyerVerificationStatus.SUSPENDED,
  ]),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/admin/lawyers/pending
 * Retrieve list of lawyers pending verification review
 */
adminLawyersRouter.get("/pending", async (req, res) => {
  try {
    const pendingLawyers = await prisma.lawyerProfile.findMany({
      where: {
        verificationStatus: LawyerVerificationStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        verificationDocuments: true,
        practiceAreas: {
          include: { practiceArea: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return sendSuccess(res, pendingLawyers);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * PATCH /api/v1/admin/lawyers/:id/verification
 * Approve or reject lawyer Bar Council verification
 */
adminLawyersRouter.patch("/:id/verification", async (req, res) => {
  const profileId = req.params["id"] as string;
  const admin = req.user!;

  const parse = verificationDecisionSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid verification decision", 400, parse.error.format());
  }

  const { status, notes } = parse.data;

  try {
    const existing = await prisma.lawyerProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!existing) {
      return sendError(res, "LAWYER_NOT_FOUND", "Lawyer profile not found", 404);
    }

    const isApproved = status === LawyerVerificationStatus.APPROVED;

    const updated = await prisma.lawyerProfile.update({
      where: { id: profileId },
      data: {
        verificationStatus: status,
        isListed: isApproved,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Update document statuses
    await prisma.lawyerVerificationDocument.updateMany({
      where: { lawyerProfileId: profileId },
      data: {
        status: isApproved
          ? VerificationDocumentStatus.APPROVED
          : VerificationDocumentStatus.REJECTED,
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });

    // Security Audit Log
    await logAuditEvent({
      actorId: admin.id,
      action: isApproved ? "APPROVE_LAWYER" : "REJECT_LAWYER",
      resourceType: "LawyerProfile",
      resourceId: profileId,
      metadata: {
        targetUserId: existing.userId,
        newStatus: status,
        barCouncilNumber: existing.barCouncilNumber,
        notes,
      },
    });

    return sendSuccess(res, updated, `Lawyer verification status updated to ${status}`);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
