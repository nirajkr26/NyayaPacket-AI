import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { ValidationError, ForbiddenError, NotFoundError } from "../utils/errors.js";

export const partiesRouter = Router({ mergeParams: true });

partiesRouter.use(authenticate);

const partySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  relationship: z.string().max(50).optional().nullable(),
  organization: z.string().max(100).optional().nullable(),
  contactInfo: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

/**
 * GET /api/v1/cases/:caseId/parties
 */
partiesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
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

    const parties = await prisma.caseParty.findMany({
      where: { caseId },
      orderBy: { name: "asc" },
    });

    return sendSuccess(res, parties, "Parties retrieved successfully");
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/cases/:caseId/parties
 */
partiesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may add parties", "CASE_ACCESS_DENIED");
    }

    const parseResult = partySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid party payload", parseResult.error.format());
    }

    const party = await prisma.caseParty.create({
      data: {
        caseId,
        name: parseResult.data.name.trim(),
        relationship: parseResult.data.relationship?.trim() || null,
        organization: parseResult.data.organization?.trim() || null,
        contactInfo: parseResult.data.contactInfo?.trim() || null,
        description: parseResult.data.description?.trim() || null,
      },
    });

    return sendSuccess(res, party, "Party added successfully", 201);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/cases/:caseId/parties/:partyId
 */
partiesRouter.delete("/:partyId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId as string;
    const partyId = req.params.partyId as string;

    const access = await canAccessCase({
      user: req.user!,
      caseId,
      scope: "VIEW_CASE_SUMMARY",
    });

    if (!access.allowed || (access.caseData?.ownerId !== req.user!.id && req.user!.role !== "ADMIN")) {
      throw new ForbiddenError("Only case owner may remove parties", "CASE_ACCESS_DENIED");
    }

    const existing = await prisma.caseParty.findFirst({
      where: { id: partyId, caseId },
    });

    if (!existing) {
      throw new NotFoundError("Party not found on this case");
    }

    await prisma.caseParty.delete({ where: { id: partyId } });
    return sendSuccess(res, { id: partyId }, "Party removed successfully");
  } catch (err) {
    next(err);
  }
});
