import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import { generateCasePacket } from "../services/pdf/packetService.js";
import { pdfQueue } from "../queues/pdfQueue.js";
import { generatePresignedDownloadUrl } from "../services/storage/s3Client.js";

export const packetsRouter = Router({ mergeParams: true });

packetsRouter.use(authenticate);

/**
 * POST /api/v1/cases/:caseId/packets/generate
 * Trigger compilation and generation of a PDF case packet dossier
 */
packetsRouter.post("/generate", async (req, res) => {
  const params = req.params as Record<string, string>;
  const caseId = (params["caseId"] || params["id"]) as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_CASE_SUMMARY",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const asyncMode = req.query["async"] === "true";

    if (asyncMode) {
      const job = await pdfQueue.add("generate-packet", {
        caseId,
        userId: user.id,
      });

      return sendSuccess(
        res,
        {
          jobId: job.id,
          status: "QUEUED",
          message: "PDF case packet generation queued",
        },
        "Packet generation queued",
        202
      );
    } else {
      const packet = await generateCasePacket(caseId, user.id);
      return sendSuccess(res, packet, "Case packet generated successfully", 201);
    }
  } catch (err: any) {
    return sendError(res, "PACKET_GENERATION_FAILED", err.message || "Failed to generate packet", 500);
  }
});

/**
 * GET /api/v1/cases/:caseId/packets
 * List all generated case packets for a case
 */
packetsRouter.get("/", async (req, res) => {
  const params = req.params as Record<string, string>;
  const caseId = (params["caseId"] || params["id"]) as string;
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_CASE_SUMMARY",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const packets = await prisma.packetGeneration.findMany({
      where: { caseId },
      select: {
        id: true,
        caseId: true,
        version: true,
        storageKey: true,
        sha256: true,
        generatedAt: true,
      },
      orderBy: { version: "desc" },
    });

    return sendSuccess(res, packets);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/cases/:caseId/packets/:version/download
 * Generate a short-lived presigned download URL for a specific packet version
 */
packetsRouter.get("/:version/download", async (req, res) => {
  const params = req.params as Record<string, string>;
  const caseId = (params["caseId"] || params["id"]) as string;
  const version = parseInt(params["version"] as string, 10);
  const user = req.user;

  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  if (isNaN(version)) {
    return sendError(res, "INVALID_VERSION", "Packet version must be an integer", 400);
  }

  // Permission check: requires DOWNLOAD_EVIDENCE scope
  const access = await canAccessCase({
    user,
    caseId,
    scope: "DOWNLOAD_EVIDENCE",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const packet = await prisma.packetGeneration.findUnique({
      where: {
        caseId_version: {
          caseId,
          version,
        },
      },
    });

    if (!packet) {
      return sendError(res, "PACKET_NOT_FOUND", `Case packet version ${version} not found`, 404);
    }

    const downloadUrl = await generatePresignedDownloadUrl(packet.storageKey, 900);

    return sendSuccess(res, {
      version: packet.version,
      sha256: packet.sha256,
      storageKey: packet.storageKey,
      downloadUrl,
      expiresInSeconds: 900,
    });
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
