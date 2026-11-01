import {
  ConsultationMode,
  ConsultationStatus,
  LawyerVerificationStatus,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";

export interface CreateConsultationParams {
  citizenId: string;
  lawyerProfileId: string;
  caseId?: string;
  mode: ConsultationMode;
  preferredAt?: Date | string;
  citizenMessage?: string;
}

export interface RespondConsultationParams {
  lawyerProfileId: string;
  consultationId: string;
  status: ConsultationStatus;
  lawyerResponse?: string;
  scheduledAt?: Date | string;
  meetingLink?: string;
  location?: string;
}

export interface CreateGrantParams {
  citizenId: string;
  caseId: string;
  lawyerProfileId: string;
  canViewSummary?: boolean;
  canViewEvidence?: boolean;
  canDownload?: boolean;
  expiresInDays?: number;
}

export async function createConsultationRequest(params: CreateConsultationParams) {
  // 1. Verify lawyer is approved
  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { id: params.lawyerProfileId },
  });

  if (!lawyer || lawyer.verificationStatus !== LawyerVerificationStatus.APPROVED) {
    throw new Error("Consultations can only be requested with verified, approved advocates");
  }

  // 2. If caseId is provided, verify citizen owns the case
  if (params.caseId) {
    const caseRecord = await prisma.case.findUnique({
      where: { id: params.caseId },
      select: { ownerId: true },
    });

    if (!caseRecord || caseRecord.ownerId !== params.citizenId) {
      throw new Error("Citizen does not own the specified case");
    }
  }

  let preferredDate: Date | null = null;
  if (params.preferredAt) {
    const d = new Date(params.preferredAt);
    if (!isNaN(d.getTime())) {
      preferredDate = d;
    }
  }

  const consultation = await prisma.consultationRequest.create({
    data: {
      citizenId: params.citizenId,
      lawyerProfileId: params.lawyerProfileId,
      caseId: params.caseId,
      mode: params.mode,
      preferredAt: preferredDate,
      citizenMessage: params.citizenMessage,
      status: ConsultationStatus.PENDING,
    },
    include: {
      lawyer: {
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phone: true },
          },
        },
      },
      case: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
  });

  logger.info({ consultationId: consultation.id, citizenId: params.citizenId }, "Consultation request created");

  return consultation;
}

export async function respondToConsultation(params: RespondConsultationParams) {
  const existing = await prisma.consultationRequest.findUnique({
    where: { id: params.consultationId },
  });

  if (!existing || existing.lawyerProfileId !== params.lawyerProfileId) {
    throw new Error("Consultation request not found or does not belong to this advocate");
  }

  let scheduledDate = existing.scheduledAt;
  if (params.scheduledAt) {
    const d = new Date(params.scheduledAt);
    if (!isNaN(d.getTime())) {
      scheduledDate = d;
    }
  }

  const updated = await prisma.consultationRequest.update({
    where: { id: params.consultationId },
    data: {
      status: params.status,
      lawyerResponse: params.lawyerResponse,
      scheduledAt: scheduledDate,
      meetingLink: params.meetingLink,
      location: params.location,
    },
    include: {
      citizen: {
        select: { id: true, fullName: true, email: true },
      },
      case: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
  });

  logger.info({ consultationId: updated.id, status: params.status }, "Consultation response recorded");

  return updated;
}

export async function createCaseAccessGrant(params: CreateGrantParams) {
  // 1. Verify citizen owns the case
  const caseRecord = await prisma.case.findUnique({
    where: { id: params.caseId },
    select: { ownerId: true },
  });

  if (!caseRecord || caseRecord.ownerId !== params.citizenId) {
    throw new Error("Only the case owner may issue access grants");
  }

  // 2. Verify lawyer is approved
  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { id: params.lawyerProfileId },
  });

  if (!lawyer || lawyer.verificationStatus !== LawyerVerificationStatus.APPROVED) {
    throw new Error("Access grants can only be issued to approved, verified advocates");
  }

  // 3. Expiration calculation
  let expiresAt: Date | null = null;
  if (params.expiresInDays && params.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);
  } else {
    // Default 30 days
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const grant = await prisma.accessGrant.create({
    data: {
      caseId: params.caseId,
      lawyerProfileId: params.lawyerProfileId,
      grantedById: params.citizenId,
      canViewSummary: params.canViewSummary ?? true,
      canViewEvidence: params.canViewEvidence ?? true,
      canDownload: params.canDownload ?? false,
      expiresAt,
    },
    include: {
      lawyer: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  });

  logger.info({ grantId: grant.id, caseId: params.caseId, lawyerProfileId: params.lawyerProfileId }, "Access grant issued");

  return grant;
}

export async function revokeCaseAccessGrant(caseId: string, grantId: string, citizenId: string) {
  const grant = await prisma.accessGrant.findUnique({
    where: { id: grantId },
    include: { case: true },
  });

  if (!grant || grant.caseId !== caseId) {
    throw new Error("Access grant not found for this case");
  }

  if (grant.case.ownerId !== citizenId) {
    throw new Error("Only the case owner may revoke access grants");
  }

  const updated = await prisma.accessGrant.update({
    where: { id: grantId },
    data: {
      revokedAt: new Date(),
    },
  });

  logger.info({ grantId, caseId }, "Access grant immediately revoked");

  return updated;
}
