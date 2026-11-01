import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";

export const categoriesRouter = Router();

/**
 * GET /api/v1/categories
 * Returns active case dispute categories
 */
categoriesRouter.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.caseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
      },
    });

    return sendSuccess(res, categories, "Case categories retrieved successfully");
  } catch (err) {
    next(err);
  }
});
