import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import { EvidenceType, ProcessingStatus } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  verifyObjectExists,
} from "../services/storage/s3Client.js";
import { enqueueEvidenceProcessing } from "../queues/evidenceQueue.js";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { ValidationError, ForbiddenError, NotFoundError } from "../utils/errors.js";
import { logAuditEvent } from "../services/audit/auditLogger.js";

export const evidenceRouter = Router({ mergeParams: true });

evidenceRouter.use(authenticate);

// MIME types whitelist
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/m4a",
  "audio/mp3",
  "audio/ogg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const uploadUrlSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val), {
    message: "Unsupported file MIME type",
  }),
  fileSize: z.number().positive().max(100 * 1024 * 1024, "File exceeds maximum 100MB limit"),
  fileType: z.nativeEnum(EvidenceType),
});

const uploadCompleteSchema = z.object({
  storageKey: z.string().min(1),
  originalName: z.string().min(1).max(255),
  mimeType: z.string(),
  fileSize: z.number().positive(),
  fileType: z.nativeEnum(EvidenceType),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, "SHA-256 must be a 64-character hex string"),
  description: z.string().max(1000).optional().nullable(),
});

/**
 * POST /api/v1/cases/:caseId/evidence/upload-url
 * Generate short-lived presigned upload URL for direct-to-S3 client upload
 */
evidenceRouter.post("/upload-url", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_EVIDENCE",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may upload evidence", "CASE_ACCESS_DENIED");
    }

    const parseResult = uploadUrlSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid upload request parameters", parseResult.error.format());
    }

    const { originalName, mimeType } = parseResult.data;
    const ext = path.extname(originalName) || ".bin";
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    const storageKey = `cases/${caseId}/${Date.now()}-${sanitizedBase}-${crypto.randomUUID().slice(0, 8)}${ext}`;

    const presigned = await generatePresignedUploadUrl(storageKey, mimeType, 900); // 15 minutes TTL

    return sendSuccess(res, presigned, "Presigned upload URL generated successfully");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases/:caseId/evidence/complete
 * Confirm upload completion, verify existence, and enqueue processing
 */
evidenceRouter.post("/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_EVIDENCE",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may record evidence uploads", "CASE_ACCESS_DENIED");
    }

    const parseResult = uploadCompleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid evidence completion payload", parseResult.error.format());
    }

    const data = parseResult.data;

    // 1. Verify object exists in storage
    const storageCheck = await verifyObjectExists(data.storageKey);
    if (!storageCheck.exists) {
      throw new ValidationError("Storage object not found. Please complete binary upload first.");
    }

    // 2. Persist Evidence record
    const evidence = await prisma.evidence.create({
      data: {
        caseId,
        uploadedById: req.user!.id,
        originalName: data.originalName,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        fileSize: BigInt(data.fileSize),
        fileType: data.fileType,
        sha256: data.sha256.toLowerCase(),
        description: data.description?.trim() || null,
        processingStatus: ProcessingStatus.QUEUED,
      },
    });

    // 3. Enqueue processing job to BullMQ
    await enqueueEvidenceProcessing({
      evidenceId: evidence.id,
      caseId,
      fileType: evidence.fileType,
      storageKey: evidence.storageKey,
    });

    // 4. Log audit event
    await logAuditEvent({
      actorId: req.user!.id,
      action: "EVIDENCE_UPLOADED",
      resourceType: "EVIDENCE",
      resourceId: evidence.id,
      metadata: { caseId, originalName: data.originalName, sha256: data.sha256 },
    });

    return sendSuccess(
      res,
      {
        ...evidence,
        fileSize: evidence.fileSize.toString(),
      },
      "Evidence uploaded and queued for processing",
      201
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cases/:caseId/evidence
 * List all evidence items on a case
 */
evidenceRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_EVIDENCE",
    });

    if (!access.allowed) {
      throw new ForbiddenError(access.reason || "Access denied", access.code || "FORBIDDEN");
    }

    const items = await prisma.evidence.findMany({
      where: { caseId },
      orderBy: { uploadedAt: "desc" },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    // Convert BigInt fileSize to string for JSON serialization
    const serialized = items.map((item) => ({
      ...item,
      fileSize: item.fileSize.toString(),
    }));

    return sendSuccess(res, serialized, "Evidence items retrieved");
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cases/:caseId/evidence/:evidenceId/download
 * Generate short-lived presigned download URL (Authorized access only)
 */
evidenceRouter.get("/:evidenceId/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const evidenceId = req.params.evidenceId as string;

    // Strict authorization gate: checks DOWNLOAD_EVIDENCE scope
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "DOWNLOAD_EVIDENCE",
    });

    if (!access.allowed) {
      throw new ForbiddenError(access.reason || "Download permission denied", access.code || "FORBIDDEN");
    }

    const evidence = await prisma.evidence.findFirst({
      where: { id: evidenceId, caseId },
    });

    if (!evidence) {
      throw new NotFoundError("Evidence item not found on this case");
    }

    const downloadUrl = await generatePresignedDownloadUrl(evidence.storageKey, 900); // 15 minutes TTL

    await logAuditEvent({
      actorId: req.user!.id,
      action: "EVIDENCE_DOWNLOADED",
      resourceType: "EVIDENCE",
      resourceId: evidence.id,
      metadata: { caseId, originalName: evidence.originalName },
    });

    return sendSuccess(res, { downloadUrl, expiresInSeconds: 900 }, "Download URL generated");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases/:caseId/evidence/:evidenceId/reprocess
 * Reprocess OCR or audio transcription
 */
evidenceRouter.post("/:evidenceId/reprocess", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const evidenceId = req.params.evidenceId as string;

    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_EVIDENCE",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may request evidence reprocessing", "CASE_ACCESS_DENIED");
    }

    const evidence = await prisma.evidence.findFirst({
      where: { id: evidenceId, caseId },
    });

    if (!evidence) {
      throw new NotFoundError("Evidence item not found");
    }

    await prisma.evidence.update({
      where: { id: evidenceId },
      data: { processingStatus: ProcessingStatus.QUEUED },
    });

    await enqueueEvidenceProcessing({
      evidenceId: evidence.id,
      caseId,
      fileType: evidence.fileType,
      storageKey: evidence.storageKey,
    });

    return sendSuccess(res, { id: evidenceId, status: "QUEUED" }, "Evidence queued for reprocessing");
  } catch (err) {
    next(err);
  }
});
