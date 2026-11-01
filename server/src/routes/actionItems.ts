import { Router } from "express";
import { z } from "zod";
import { ActionItemStatus } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";

export const actionItemsRouter = Router({ mergeParams: true });

actionItemsRouter.use(authenticate);

const createActionItemSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateActionItemSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z
    .enum([
      ActionItemStatus.TODO,
      ActionItemStatus.IN_PROGRESS,
      ActionItemStatus.COMPLETED,
      ActionItemStatus.CANCELLED,
    ])
    .optional(),
});

/**
 * POST /api/v1/cases/:caseId/action-items
 * Create an action item in the collaboration workspace
 */
actionItemsRouter.post("/", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const user = req.user!;

  const access = await canAccessCase({
    user,
    caseId,
    scope: "MANAGE_ACTION_ITEMS",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  const parse = createActionItemSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid action item data", 400, parse.error.format());
  }

  const { title, description, dueDate, assignedToId } = parse.data;

  try {
    let parsedDueDate: Date | null = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (!isNaN(d.getTime())) {
        parsedDueDate = d;
      }
    }

    const item = await prisma.actionItem.create({
      data: {
        caseId,
        createdById: user.id,
        assignedToId,
        title,
        description,
        dueDate: parsedDueDate,
        status: ActionItemStatus.TODO,
      },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
      },
    });

    return sendSuccess(res, item, "Action item created", 201);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/cases/:caseId/action-items
 * List action items for a case
 */
actionItemsRouter.get("/", async (req, res) => {
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
    const items = await prisma.actionItem.findMany({
      where: { caseId },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        assignedTo: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });

    return sendSuccess(res, items);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * PATCH /api/v1/cases/:caseId/action-items/:itemId
 * Update action item status or details
 */
actionItemsRouter.patch("/:itemId", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const itemId = req.params["itemId"] as string;
  const user = req.user!;

  const access = await canAccessCase({
    user,
    caseId,
    scope: "MANAGE_ACTION_ITEMS",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  const parse = updateActionItemSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid update payload", 400, parse.error.format());
  }

  try {
    const existing = await prisma.actionItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.caseId !== caseId) {
      return sendError(res, "NOT_FOUND", "Action item not found", 404);
    }

    let parsedDueDate = existing.dueDate;
    if (parse.data.dueDate !== undefined) {
      const d = new Date(parse.data.dueDate);
      parsedDueDate = !isNaN(d.getTime()) ? d : null;
    }

    const isCompleted = parse.data.status === ActionItemStatus.COMPLETED;

    const updated = await prisma.actionItem.update({
      where: { id: itemId },
      data: {
        ...(parse.data.title !== undefined && { title: parse.data.title }),
        ...(parse.data.description !== undefined && { description: parse.data.description }),
        ...(parse.data.dueDate !== undefined && { dueDate: parsedDueDate }),
        ...(parse.data.assignedToId !== undefined && { assignedToId: parse.data.assignedToId }),
        ...(parse.data.status !== undefined && { status: parse.data.status }),
        ...(isCompleted && { completedAt: new Date() }),
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    return sendSuccess(res, updated, "Action item updated successfully");
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * DELETE /api/v1/cases/:caseId/action-items/:itemId
 * Delete an action item
 */
actionItemsRouter.delete("/:itemId", async (req, res) => {
  const caseId = (req.params.caseId || req.params.id) as string;
  const itemId = req.params["itemId"] as string;
  const user = req.user!;

  const access = await canAccessCase({
    user,
    caseId,
    scope: "MANAGE_ACTION_ITEMS",
  });

  if (!access.allowed) {
    return sendError(res, access.code || "FORBIDDEN", access.reason || "Access denied", access.statusCode || 403);
  }

  try {
    const existing = await prisma.actionItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.caseId !== caseId) {
      return sendError(res, "NOT_FOUND", "Action item not found", 404);
    }

    await prisma.actionItem.delete({
      where: { id: itemId },
    });

    return sendSuccess(res, { deleted: true }, "Action item deleted");
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
