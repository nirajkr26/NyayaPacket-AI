import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CasePriority, CaseStatus, UserRole } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { allowRoles } from "../middleware/rbac.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import * as caseService from "../services/case/caseService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { ValidationError, ForbiddenError, NotFoundError } from "../utils/errors.js";

export const casesRouter = Router();

// All case routes require authentication
casesRouter.use(authenticate);

const createCaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  categoryId: z.string().min(1, "Case category is required"),
  description: z.string().max(5000).optional().nullable(),
  priority: z.nativeEnum(CasePriority).optional(),
  incidentDate: z.string().datetime({ offset: true }).optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  parties: z
    .array(
      z.object({
        name: z.string().min(1, "Party name is required").max(100),
        relationship: z.string().max(50).optional().nullable(),
        organization: z.string().max(100).optional().nullable(),
        contactInfo: z.string().max(100).optional().nullable(),
        description: z.string().max(500).optional().nullable(),
      })
    )
    .optional(),
});

const updateCaseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: z.nativeEnum(CasePriority).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
  incidentDate: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  statusNote: z.string().max(500).optional().nullable(),
});

/**
 * GET /api/v1/cases/dashboard/stats
 * Citizen dashboard metrics
 */
casesRouter.get("/dashboard/stats", allowRoles(UserRole.CITIZEN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await caseService.getCitizenDashboardStats(req.user!.id);
    return sendSuccess(res, stats, "Dashboard statistics retrieved");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases
 * Create new case (Citizen role only)
 */
casesRouter.post("/", allowRoles(UserRole.CITIZEN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = createCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid case payload", parseResult.error.format());
    }

    const createdCase = await caseService.createCase(req.user!, parseResult.data);
    return sendSuccess(res, createdCase, "Case created successfully", 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cases
 * List cases accessible to user
 */
casesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { status, categoryId, search, page, limit } = req.query;

    const filter: caseService.ListCasesFilter = {
      status: typeof status === "string" ? (status as CaseStatus) : undefined,
      categoryId: typeof categoryId === "string" ? categoryId : undefined,
      search: typeof search === "string" ? search : undefined,
      page: typeof page === "string" ? parseInt(page, 10) : 1,
      limit: typeof limit === "string" ? parseInt(limit, 10) : 20,
    };

    // If citizen, strictly limit to citizen's own cases
    if (user.role === UserRole.CITIZEN) {
      filter.ownerId = user.id;
    }

    const result = await caseService.listCases(filter);
    return sendSuccess(res, result.items, "Cases retrieved successfully", 200, result.pagination);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/cases/:id
 * Get single case details (Gated by canAccessCase)
 */
casesRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.id as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed) {
      if (access.statusCode === 404) {
        throw new NotFoundError(access.reason);
      }
      throw new ForbiddenError(access.reason || "Access denied", access.code || "FORBIDDEN");
    }

    const caseData = await caseService.getCaseDetails(caseId);
    return sendSuccess(res, caseData, "Case details retrieved");
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/cases/:id
 * Update case details (Citizen owner or Admin)
 */
casesRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.id as string;
    const parseResult = updateCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid case update payload", parseResult.error.format());
    }

    const updated = await caseService.updateCase(req.user!, caseId, parseResult.data);
    return sendSuccess(res, updated, "Case updated successfully");
  } catch (err) {
    next(err);
  }
});
