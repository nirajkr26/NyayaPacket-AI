import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { ValidationError } from "../utils/errors.js";

export const usersRouter = Router();

const updateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100).optional(),
  phone: z
    .string()
    .regex(/^[+0-9\s-]{10,15}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  profileImage: z.string().url("Profile image must be a valid URL").optional().nullable(),
});

/**
 * GET /api/v1/users/me
 * Returns full profile of the authenticated user
 */
usersRouter.get("/me", authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    return sendSuccess(res, user, "User profile retrieved");
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/users/me
 * Updates allowed profile fields (fullName, phone, profileImage)
 * Rejects/ignores attempts to modify role, authUserId, or account status.
 */
usersRouter.patch("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError("Invalid profile update payload", parseResult.error.format());
    }

    const { fullName, phone, profileImage } = parseResult.data;
    const currentUserId = req.user!.id;

    // Filter update data to permitted attributes only
    const dataToUpdate: Record<string, any> = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (profileImage !== undefined) dataToUpdate.profileImage = profileImage;

    const updatedUser = await prisma.user.update({
      where: { id: currentUserId },
      data: dataToUpdate,
      include: { lawyerProfile: true },
    });

    return sendSuccess(res, updatedUser, "Profile updated successfully");
  } catch (err) {
    next(err);
  }
});
