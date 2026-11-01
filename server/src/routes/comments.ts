import { Router } from "express";
import { z } from "zod";
import { CommentVisibility, UserRole } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.use(authenticate);

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty").max(5000),
  visibility: z
    .enum([
      CommentVisibility.SHARED_WITH_CITIZEN,
      CommentVisibility.PRIVATE_LAWYER_NOTE,
    ])
    .default(CommentVisibility.SHARED_WITH_CITIZEN),
});

/**
 * POST /api/v1/cases/:caseId/comments
 * Add a comment or private lawyer note
 */
commentsRouter.post("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user!;

  const access = await canAccessCase({
    user,
    caseId,
    scope: "COMMENT_ON_CASE",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  const parse = createCommentSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid comment data", 400, parse.error.format());
  }

  const { content, visibility } = parse.data;

  // Security rule: Citizens cannot create private lawyer notes
  if (user.role === UserRole.CITIZEN && visibility === CommentVisibility.PRIVATE_LAWYER_NOTE) {
    return sendError(res, "FORBIDDEN", "Citizens cannot create private lawyer notes", 403);
  }

  try {
    // If user is lawyer, find their profile ID
    let lawyerProfileId: string | null = null;
    if (user.role === UserRole.LAWYER) {
      const profile = await prisma.lawyerProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      lawyerProfileId = profile?.id || null;
    }

    const comment = await prisma.caseComment.create({
      data: {
        caseId,
        authorId: user.id,
        lawyerProfileId,
        content,
        visibility,
      },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return sendSuccess(res, comment, "Comment added successfully", 201);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/cases/:caseId/comments
 * Retrieve case comments with visibility filtering
 */
commentsRouter.get("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user!;

  const access = await canAccessCase({
    user,
    caseId,
    scope: "VIEW_CASE_SUMMARY",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    // Privacy filter: Citizens can ONLY see SHARED_WITH_CITIZEN comments
    const where: any = { caseId };
    if (user.role === UserRole.CITIZEN) {
      where.visibility = CommentVisibility.SHARED_WITH_CITIZEN;
    }

    const comments = await prisma.caseComment.findMany({
      where,
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return sendSuccess(res, comments);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
