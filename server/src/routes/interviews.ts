import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import * as interviewService from "../services/interview/interviewService.js";
import { sendSuccess } from "../utils/response.js";
import { ValidationError, ForbiddenError } from "../utils/errors.js";

export const interviewsRouter = Router({ mergeParams: true });

interviewsRouter.use(authenticate);

const messageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(5000),
  audioStorageKey: z.string().optional().nullable(),
});

/**
 * POST /api/v1/cases/:caseId/interviews
 * Start a new interview or resume existing active session
 */
interviewsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may participate in the intake interview", "CASE_ACCESS_DENIED");
    }

    const session = await interviewService.startOrResumeSession(caseId, req.user!);
    return sendSuccess(res, session, "Interview session ready", 200);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cases/:caseId/interviews/:sessionId
 * Retrieve session messages and state
 */
interviewsRouter.get("/:sessionId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const sessionId = req.params.sessionId as string;

    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed) {
      throw new ForbiddenError(access.reason || "Access denied", access.code || "FORBIDDEN");
    }

    const session = await interviewService.getSession(caseId, sessionId);
    return sendSuccess(res, session, "Interview session retrieved");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases/:caseId/interviews/:sessionId/messages
 * Post citizen response and obtain next guided question
 */
interviewsRouter.post("/:sessionId/messages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const sessionId = req.params.sessionId as string;

    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may answer interview questions", "CASE_ACCESS_DENIED");
    }

    const parseResult = messageSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid message payload", parseResult.error.format());
    }

    const result = await interviewService.addMessage(
      sessionId,
      parseResult.data.content,
      parseResult.data.audioStorageKey
    );

    return sendSuccess(res, result, "Message processed", 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases/:caseId/interviews/:sessionId/complete
 * Conclude intake interview and generate citizen statement
 */
interviewsRouter.post("/:sessionId/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const sessionId = req.params.sessionId as string;

    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may complete the interview", "CASE_ACCESS_DENIED");
    }

    const statement = await interviewService.completeInterview(caseId, sessionId, req.user!);
    return sendSuccess(res, statement, "Interview completed and statement generated successfully", 200);
  } catch (err) {
    next(err);
  }
});
