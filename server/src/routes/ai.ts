import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import { runCaseAnalysis } from "../services/ai/caseAnalysisService.js";
import { aiAnalysisQueue } from "../queues/aiAnalysisQueue.js";

export const aiRouter = Router({ mergeParams: true });

aiRouter.use(authenticate);

/**
 * POST /api/v1/cases/:caseId/ai/analyze
 * Trigger AI analysis (synchronously or background queue)
 */
aiRouter.post("/analyze", async (req, res) => {
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
      const job = await aiAnalysisQueue.add("analyze-case", {
        caseId,
        userId: user.id,
      });

      return sendSuccess(
        res,
        {
          jobId: job.id,
          status: "QUEUED",
        },
        "AI analysis queued for background processing",
        202
      );
    } else {
      // Synchronous execution for immediate turnaround or tests
      const result = await runCaseAnalysis(caseId, user.id);
      return sendSuccess(res, result, "Case analysis completed successfully", 200);
    }
  } catch (err: any) {
    return sendError(res, "AI_ANALYSIS_FAILED", err.message || "Failed to analyze case", 500);
  }
});

/**
 * GET /api/v1/cases/:caseId/ai/runs
 * List all AI runs performed on this case
 */
aiRouter.get("/runs", async (req, res) => {
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
    const runs = await prisma.aiRun.findMany({
      where: { caseId },
      include: {
        sources: {
          include: {
            evidence: {
              select: { id: true, originalName: true, description: true },
            },
            statement: {
              select: { id: true, type: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, runs);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
