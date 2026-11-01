import { Router } from "express";
import { z } from "zod";
import { VerificationStatus } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import { validateCaseSources } from "../services/ai/provenanceValidator.js";

export const timelineRouter = Router({ mergeParams: true });

timelineRouter.use(authenticate);

const createTimelineEventSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  sourceIds: z.array(z.string()).optional(),
});

const updateTimelineEventSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
  verificationStatus: z
    .enum([
      VerificationStatus.UNVERIFIED,
      VerificationStatus.CITIZEN_CONFIRMED,
      VerificationStatus.CITIZEN_CORRECTED,
      VerificationStatus.LAWYER_REVIEWED,
      VerificationStatus.DISPUTED,
    ])
    .optional(),
});

const createVerificationSchema = z.object({
  verificationNote: z.string().optional(),
});

/**
 * GET /api/v1/cases/:caseId/timeline
 * Get all timeline events for a case with linked sources
 */
timelineRouter.get("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_TIMELINE",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const events = await prisma.timelineEvent.findMany({
      where: { caseId },
      include: {
        sources: {
          include: {
            evidence: {
              select: { id: true, originalName: true, fileType: true, description: true },
            },
            statement: {
              select: { id: true, type: true, content: true },
            },
          },
        },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    });

    return sendSuccess(res, events);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * POST /api/v1/cases/:caseId/timeline
 * Add a manual timeline event with optional source citations
 */
timelineRouter.post("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_TIMELINE",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  const parse = createTimelineEventSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid timeline data", 400, parse.error.format());
  }

  const { title, description, eventDate, sourceIds } = parse.data;

  try {
    let parsedDate: Date | null = null;
    if (eventDate) {
      const d = new Date(eventDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    // Provenance validation on candidate sources
    const provenance = await validateCaseSources(caseId, sourceIds || []);

    const event = await prisma.timelineEvent.create({
      data: {
        caseId,
        title,
        description,
        eventDate: parsedDate,
        verificationStatus: VerificationStatus.CITIZEN_CONFIRMED,
      },
    });

    // Link valid evidence sources
    for (const evId of provenance.validEvidenceIds) {
      await prisma.timelineEventSource.create({
        data: {
          timelineEventId: event.id,
          evidenceId: evId,
        },
      });
    }

    // Link valid statement sources
    for (const stId of provenance.validStatementIds) {
      await prisma.timelineEventSource.create({
        data: {
          timelineEventId: event.id,
          statementId: stId,
        },
      });
    }

    const completeEvent = await prisma.timelineEvent.findUnique({
      where: { id: event.id },
      include: {
        sources: {
          include: {
            evidence: { select: { id: true, originalName: true, description: true } },
            statement: { select: { id: true, type: true } },
          },
        },
      },
    });

    return sendSuccess(res, completeEvent, "Timeline event created", 201);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * PATCH /api/v1/cases/:caseId/timeline/:eventId
 * Update timeline event or update verification status
 */
timelineRouter.patch("/:eventId", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const eventId = req.params["eventId"] as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_TIMELINE",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  const parse = updateTimelineEventSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid update payload", 400, parse.error.format());
  }

  try {
    const existing = await prisma.timelineEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing || existing.caseId !== caseId) {
      return sendError(res, "NOT_FOUND", "Timeline event not found", 404);
    }

    let parsedDate = existing.eventDate;
    if (parse.data.eventDate !== undefined) {
      const d = new Date(parse.data.eventDate);
      parsedDate = !isNaN(d.getTime()) ? d : null;
    }

    const updated = await prisma.timelineEvent.update({
      where: { id: eventId },
      data: {
        ...(parse.data.title !== undefined && { title: parse.data.title }),
        ...(parse.data.description !== undefined && { description: parse.data.description }),
        ...(parse.data.eventDate !== undefined && { eventDate: parsedDate }),
        ...(parse.data.verificationStatus !== undefined && {
          verificationStatus: parse.data.verificationStatus,
        }),
      },
      include: {
        sources: true,
      },
    });

    return sendSuccess(res, updated, "Timeline event updated");
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * DELETE /api/v1/cases/:caseId/timeline/:eventId
 * Delete a timeline event
 */
timelineRouter.delete("/:eventId", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const eventId = req.params["eventId"] as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_TIMELINE",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const existing = await prisma.timelineEvent.findUnique({
      where: { id: eventId },
    });

    if (!existing || existing.caseId !== caseId) {
      return sendError(res, "NOT_FOUND", "Timeline event not found", 404);
    }

    await prisma.timelineEvent.delete({
      where: { id: eventId },
    });

    return sendSuccess(res, { deleted: true }, "Timeline event deleted");
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * POST /api/v1/cases/:caseId/verify
 * Citizen formally signs off and creates a CaseVerification snapshot
 */
timelineRouter.post("/verify", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  // Only case owner (citizen) can formally certify the case facts
  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_CASE_SUMMARY",
  });

  if (!access.allowed || access.caseData?.ownerId !== user.id) {
    return sendError(res, "FORBIDDEN", "Only the case owner can certify case verification", 403);
  }

  const parse = createVerificationSchema.safeParse(req.body);
  const note = parse.success ? parse.data.verificationNote : undefined;

  try {
    const previousVerificationsCount = await prisma.caseVerification.count({
      where: { caseId },
    });

    const verification = await prisma.caseVerification.create({
      data: {
        caseId,
        verifiedById: user.id,
        snapshotVersion: previousVerificationsCount + 1,
        verificationNote: note || "Citizen verified all factual claims and timeline events as accurate.",
      },
      include: {
        verifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return sendSuccess(res, verification, "Case verified and certified", 201);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/cases/:caseId/verifications
 * List verification snapshots for the case
 */
timelineRouter.get("/verifications", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_VERIFICATION_HISTORY",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const verifications = await prisma.caseVerification.findMany({
      where: { caseId },
      include: {
        verifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { snapshotVersion: "desc" },
    });

    return sendSuccess(res, verifications);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
