import { Router } from "express";
import { z } from "zod";
import { LawyerVerificationStatus, UserRole } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import { listPublicLawyers, getPublicLawyerById } from "../services/lawyer/lawyerService.js";

export const lawyersRouter = Router();

const lawyerProfileSchema = z.object({
  barCouncilNumber: z.string().min(3, "Bar Council Number is required"),
  stateBarCouncil: z.string().min(2, "State Bar Council is required"),
  enrollmentYear: z.number().int().min(1950).max(new Date().getFullYear()),
  experienceYears: z.number().int().min(0).default(0),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string()).default(["English", "Hindi"]),
  consultationOnline: z.boolean().default(true),
  consultationInPerson: z.boolean().default(false),
  practiceAreaIds: z.array(z.string()).optional(),
});

const verificationDocSchema = z.object({
  documentType: z.string().min(2, "Document type is required"),
  originalName: z.string().min(1, "Original name is required"),
  storageKey: z.string().min(5, "Storage key is required"),
});

/**
 * GET /api/v1/lawyers
 * Public directory search for verified lawyers
 */
lawyersRouter.get("/", async (req, res) => {
  try {
    const { city, state, practiceArea, search, page, limit } = req.query;

    const result = await listPublicLawyers({
      city: city as string | undefined,
      state: state as string | undefined,
      practiceArea: practiceArea as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    return sendSuccess(res, result.lawyers, "Lawyers retrieved successfully", 200, result.pagination);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/lawyers/me/profile
 * Get current lawyer's profile
 */
lawyersRouter.get("/me/profile", authenticate, async (req, res) => {
  const user = req.user;
  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  try {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
      include: {
        practiceAreas: {
          include: { practiceArea: true },
        },
        verificationDocuments: true,
        availability: true,
      },
    });

    if (!profile) {
      return sendError(res, "PROFILE_NOT_FOUND", "Lawyer profile not yet initialized", 404);
    }

    return sendSuccess(res, profile);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * POST /api/v1/lawyers/me/profile
 * Onboard or update lawyer profile
 */
lawyersRouter.post("/me/profile", authenticate, async (req, res) => {
  const user = req.user;
  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  // Ensure user has LAWYER role or promote them
  if (user.role !== UserRole.LAWYER) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.LAWYER },
    });
  }

  const parse = lawyerProfileSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid lawyer profile data", 400, parse.error.format());
  }

  const data = parse.data;

  try {
    const existing = await prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
    });

    let profile;
    if (existing) {
      profile = await prisma.lawyerProfile.update({
        where: { id: existing.id },
        data: {
          barCouncilNumber: data.barCouncilNumber,
          stateBarCouncil: data.stateBarCouncil,
          enrollmentYear: data.enrollmentYear,
          experienceYears: data.experienceYears,
          city: data.city,
          state: data.state,
          bio: data.bio,
          languages: data.languages,
          consultationOnline: data.consultationOnline,
          consultationInPerson: data.consultationInPerson,
        },
      });
    } else {
      profile = await prisma.lawyerProfile.create({
        data: {
          userId: user.id,
          barCouncilNumber: data.barCouncilNumber,
          stateBarCouncil: data.stateBarCouncil,
          enrollmentYear: data.enrollmentYear,
          experienceYears: data.experienceYears,
          city: data.city,
          state: data.state,
          bio: data.bio,
          languages: data.languages,
          consultationOnline: data.consultationOnline,
          consultationInPerson: data.consultationInPerson,
          verificationStatus: LawyerVerificationStatus.PENDING,
          isListed: false,
        },
      });
    }

    // Connect practice areas if provided
    if (data.practiceAreaIds && data.practiceAreaIds.length > 0) {
      await prisma.lawyerPracticeArea.deleteMany({
        where: { lawyerProfileId: profile.id },
      });

      for (const areaId of data.practiceAreaIds) {
        await prisma.lawyerPracticeArea.create({
          data: {
            lawyerProfileId: profile.id,
            practiceAreaId: areaId,
          },
        }).catch(() => {});
      }
    }

    const updatedProfile = await prisma.lawyerProfile.findUnique({
      where: { id: profile.id },
      include: {
        practiceAreas: { include: { practiceArea: true } },
      },
    });

    return sendSuccess(res, updatedProfile, "Lawyer profile saved successfully", existing ? 200 : 201);
  } catch (err: any) {
    if (err.code === "P2002") {
      return sendError(res, "BAR_NUMBER_EXISTS", "Bar Council Number is already registered", 409);
    }
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * POST /api/v1/lawyers/me/documents
 * Submit verification document (Bar Council enrollment certificate, Bar ID)
 */
lawyersRouter.post("/me/documents", authenticate, async (req, res) => {
  const user = req.user;
  if (!user) {
    return sendError(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return sendError(res, "PROFILE_REQUIRED", "Please create lawyer profile before submitting documents", 400);
  }

  const parse = verificationDocSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid document details", 400, parse.error.format());
  }

  try {
    const doc = await prisma.lawyerVerificationDocument.create({
      data: {
        lawyerProfileId: profile.id,
        documentType: parse.data.documentType,
        originalName: parse.data.originalName,
        storageKey: parse.data.storageKey,
      },
    });

    return sendSuccess(res, doc, "Verification document submitted", 201);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/lawyers/:id
 * Get single approved lawyer public profile
 */
lawyersRouter.get("/:id", async (req, res) => {
  const id = req.params["id"] as string;

  try {
    const lawyer = await getPublicLawyerById(id);
    if (!lawyer) {
      return sendError(res, "LAWYER_NOT_FOUND", "Lawyer profile not found or not currently listed", 404);
    }

    return sendSuccess(res, lawyer);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
