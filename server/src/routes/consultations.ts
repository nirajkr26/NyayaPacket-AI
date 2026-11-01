import { Router } from "express";
import { z } from "zod";
import { ConsultationMode, ConsultationStatus } from "@prisma/client";
import { authenticate } from "../middleware/authenticate.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { prisma } from "../lib/prisma.js";
import {
  createConsultationRequest,
  respondToConsultation,
} from "../services/consultation/consultationService.js";

export const consultationsRouter = Router();

consultationsRouter.use(authenticate);

const createConsultationSchema = z.object({
  lawyerProfileId: z.string().min(1, "Lawyer Profile ID is required"),
  caseId: z.string().optional(),
  mode: z.enum([ConsultationMode.ONLINE, ConsultationMode.IN_PERSON]).default(ConsultationMode.ONLINE),
  preferredAt: z.string().optional(),
  citizenMessage: z.string().max(2000).optional(),
});

const respondConsultationSchema = z.object({
  status: z.enum([
    ConsultationStatus.ACCEPTED,
    ConsultationStatus.DECLINED,
    ConsultationStatus.RESCHEDULE_REQUESTED,
  ]),
  lawyerResponse: z.string().max(2000).optional(),
  scheduledAt: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  location: z.string().max(500).optional(),
});

/**
 * POST /api/v1/consultations
 * Citizen creates consultation request with an approved lawyer
 */
consultationsRouter.post("/", async (req, res) => {
  const user = req.user!;

  const parse = createConsultationSchema.safeParse(req.body);
  if (!parse.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid consultation request", 400, parse.error.format());
  }

  try {
    const consultation = await createConsultationRequest({
      citizenId: user.id,
      lawyerProfileId: parse.data.lawyerProfileId,
      caseId: parse.data.caseId,
      mode: parse.data.mode,
      preferredAt: parse.data.preferredAt,
      citizenMessage: parse.data.citizenMessage,
    });

    return sendSuccess(res, consultation, "Consultation requested successfully", 201);
  } catch (err: any) {
    return sendError(res, "CONSULTATION_REQUEST_FAILED", err.message, 400);
  }
});

/**
 * GET /api/v1/consultations/my
 * Citizen lists their consultation requests
 */
consultationsRouter.get("/my", async (req, res) => {
  const user = req.user!;

  try {
    const consultations = await prisma.consultationRequest.findMany({
      where: { citizenId: user.id },
      include: {
        lawyer: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            practiceAreas: { include: { practiceArea: true } },
          },
        },
        case: {
          select: { id: true, caseNumber: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, consultations);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * GET /api/v1/consultations/lawyer
 * Lawyer retrieves incoming consultations
 */
consultationsRouter.get("/lawyer", async (req, res) => {
  const user = req.user!;

  try {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return sendError(res, "NOT_A_LAWYER", "User is not registered as an advocate", 403);
    }

    const consultations = await prisma.consultationRequest.findMany({
      where: { lawyerProfileId: profile.id },
      include: {
        citizen: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        case: {
          select: { id: true, caseNumber: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, consultations);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * PATCH /api/v1/consultations/:id/respond
 * Lawyer accepts, declines, or reschedules a consultation
 */
consultationsRouter.patch("/:id/respond", async (req, res) => {
  const user = req.user!;
  const consultationId = req.params["id"] as string;

  try {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return sendError(res, "NOT_A_LAWYER", "User is not registered as an advocate", 403);
    }

    const parse = respondConsultationSchema.safeParse(req.body);
    if (!parse.success) {
      return sendError(res, "VALIDATION_ERROR", "Invalid response data", 400, parse.error.format());
    }

    const updated = await respondToConsultation({
      lawyerProfileId: profile.id,
      consultationId,
      status: parse.data.status,
      lawyerResponse: parse.data.lawyerResponse,
      scheduledAt: parse.data.scheduledAt,
      meetingLink: parse.data.meetingLink || undefined,
      location: parse.data.location,
    });

    return sendSuccess(res, updated, `Consultation status updated to ${parse.data.status}`);
  } catch (err: any) {
    return sendError(res, "CONSULTATION_UPDATE_FAILED", err.message, 400);
  }
});
