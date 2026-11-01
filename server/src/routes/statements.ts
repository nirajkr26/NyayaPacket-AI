import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { StatementType } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { ValidationError, ForbiddenError } from "../utils/errors.js";

export const statementsRouter = Router({ mergeParams: true });

statementsRouter.use(authenticate);

const createStatementSchema = z.object({
  content: z.string().min(5, "Statement content must be at least 5 characters").max(10000),
  type: z.nativeEnum(StatementType).default(StatementType.MANUAL_CORRECTION),
  language: z.string().default("en"),
});

/**
 * GET /api/v1/cases/:caseId/statements
 * Retrieve all statements associated with a case
 */
statementsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed) {
      throw new ForbiddenError(access.reason || "Access denied", access.code || "FORBIDDEN");
    }

    const statements = await prisma.statement.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return sendSuccess(res, statements, "Statements retrieved successfully");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases/:caseId/statements
 * Add a manual citizen statement or factual correction
 */
statementsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may record a statement", "CASE_ACCESS_DENIED");
    }

    const parseResult = createStatementSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid statement payload", parseResult.error.format());
    }

    const statement = await prisma.statement.create({
      data: {
        caseId,
        authorId: req.user!.id,
        content: parseResult.data.content.trim(),
        type: parseResult.data.type,
        language: parseResult.data.language,
      },
    });

    return sendSuccess(res, statement, "Statement added successfully", 201);
  } catch (err) {
    next(err);
  }
});
