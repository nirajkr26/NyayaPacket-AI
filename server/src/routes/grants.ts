import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import {
  createCaseAccessGrant,
  revokeCaseAccessGrant,
} from "../services/consultation/consultationService.js";

export const grantsRouter = Router({ mergeParams: true });

grantsRouter.use(authenticate);

const createGrantSchema = z.object({
  lawyerProfileId: z.string().min(1, "Lawyer Profile ID is required"),
  canViewSummary: z.boolean().default(true),
  canViewEvidence: z.boolean().default(true),
  canDownload: z.boolean().default(false),
  expiresInDays: z.number().int().min(1).max(365).default(30),
});

/**
 * POST /api/v1/cases/:caseId/grants
 * Citizen issues a scoped access grant to a verified lawyer
 */
grantsRouter.post("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user!;

  const parse = createGrantSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid grant parameters", 400, parse.error.format());
  }

  try {
    const grant = await createCaseAccessGrant({
      citizenId: user.id,
      caseId,
      lawyerProfileId: parse.data.lawyerProfileId,
      canViewSummary: parse.data.canViewSummary,
      canViewEvidence: parse.data.canViewEvidence,
      canDownload: parse.data.canDownload,
      expiresInDays: parse.data.expiresInDays,
    });

    return sendSuccess(res, grant, "Access grant created successfully", 201);
  } catch (err: any) {
    return sendError(res, "GRANT_CREATION_FAILED", err.message, 403);
  }
});

/**
 * GET /api/v1/cases/:caseId/grants
 * Citizen lists all grants issued for their case
 */
grantsRouter.get("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user!;

  try {
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { ownerId: true },
    });

    if (!caseRecord || caseRecord.ownerId !== user.id) {
      return sendError(res, "FORBIDDEN", "Only the case owner may view access grants", 403);
    }

    const grants = await prisma.accessGrant.findMany({
      where: { caseId },
      include: {
        lawyer: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
      orderBy: { grantedAt: "desc" },
    });

    return sendSuccess(res, grants);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * DELETE /api/v1/cases/:caseId/grants/:grantId
 * Citizen immediately revokes lawyer's access grant
 */
grantsRouter.delete("/:grantId", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const grantId = req.params["grantId"] as string;
  const user = req.user!;

  try {
    const revoked = await revokeCaseAccessGrant(caseId, grantId, user.id);
    return sendSuccess(res, revoked, "Access grant revoked immediately");
  } catch (err: any) {
    return sendError(res, "REVOCATION_FAILED", err.message, 403);
  }
});
