import {
  AiRunType,
  CaseStatus,
  ProcessingStatus,
  NotificationType,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";
import { createNotification } from "../notification/notificationService.js";
import { generateCasePacketPdf } from "./pdfGenerator.js";
import type { PacketTemplateData } from "./templates/packetTemplate.js";

export async function generateCasePacket(caseId: string, _triggeredById?: string) {
  logger.info({ caseId }, "Compiling legal case packet dossier");

  // 1. Gather comprehensive case records
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      category: true,
      owner: true,
      parties: true,
      timelineEvents: {
        include: {
          sources: {
            include: {
              evidence: { select: { id: true, originalName: true } },
              statement: { select: { id: true, type: true } },
            },
          },
        },
        orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
      },
      evidence: {
        where: { processingStatus: ProcessingStatus.COMPLETED },
        orderBy: { uploadedAt: "asc" },
      },
      aiRuns: {
        where: {
          type: AiRunType.CASE_SUMMARY,
          status: ProcessingStatus.COMPLETED,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      verifications: {
        include: {
          verifiedBy: { select: { fullName: true } },
        },
        orderBy: { snapshotVersion: "desc" },
        take: 1,
      },
    },
  });

  if (!caseRecord) {
    throw new Error(`Case with ID ${caseId} not found`);
  }

  // Determine next packet version monotonically
  const latestPacket = await prisma.packetGeneration.findFirst({
    where: { caseId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestPacket?.version ?? 0) + 1;

  // Extract latest AI Case Summary if available
  const latestSummaryRun = caseRecord.aiRuns[0];
  const summaryOutput = (latestSummaryRun?.normalizedOutput as any) || {};

  const summary =
    summaryOutput.summary ||
    caseRecord.description ||
    "Citizen intake completed. Awaiting detailed advocate factual conference.";

  const keyIssues: string[] = summaryOutput.keyIssues || [
    "Factual review and relief quantification under applicable Indian law",
  ];

  const reliefSought: string =
    summaryOutput.reliefSought || "Legal redress and compensation as quantified by counsel";

  const strengths: string[] = summaryOutput.strengths || [];
  const weaknesses: string[] = summaryOutput.weaknesses || [];
  const missingInformation: string[] = summaryOutput.missingInformation || [
    "Consultation with advocate to formulate dispute strategy",
  ];

  // Compile timeline data
  const timeline = caseRecord.timelineEvents.map((evt) => ({
    date: evt.eventDate ? evt.eventDate.toISOString().slice(0, 10) : "Undated",
    title: evt.title,
    description: evt.description || undefined,
    verificationStatus: evt.verificationStatus,
    sources: evt.sources.map(
      (s) => s.evidence?.originalName || (s.statement ? `Statement (${s.statement.type})` : "Verified claim")
    ),
  }));

  // Compile evidence manifest
  const evidence = caseRecord.evidence.map((ev) => ({
    originalName: ev.originalName,
    fileType: ev.fileType,
    sha256: ev.sha256,
    description: ev.description || undefined,
  }));

  // Compile verification data
  const latestVerification = caseRecord.verifications[0];
  const verification = latestVerification
    ? {
        verifiedAt: latestVerification.verifiedAt.toISOString().slice(0, 10),
        verifierName: latestVerification.verifiedBy.fullName,
        note: latestVerification.verificationNote || undefined,
      }
    : undefined;

  const templateData: PacketTemplateData = {
    caseNumber: caseRecord.caseNumber,
    version: nextVersion,
    generatedAt: new Date().toISOString(),
    categoryName: caseRecord.category.name,
    citizenName: caseRecord.owner.fullName,
    citizenEmail: caseRecord.owner.email,
    citizenPhone: caseRecord.owner.phone || undefined,
    city: caseRecord.city || undefined,
    state: caseRecord.state || undefined,
    incidentDate: caseRecord.incidentDate
      ? caseRecord.incidentDate.toISOString().slice(0, 10)
      : undefined,
    parties: caseRecord.parties.map((p) => ({
      name: p.name,
      relationship: p.relationship || undefined,
    })),
    summary,
    keyIssues,
    reliefSought,
    strengths,
    weaknesses,
    missingInformation,
    timeline,
    evidence,
    verification,
  };

  // 2. Render and upload PDF
  const { sha256, storageKey } = await generateCasePacketPdf(
    caseId,
    nextVersion,
    templateData
  );

  // 3. Persist PacketGeneration record
  const packet = await prisma.packetGeneration.create({
    data: {
      caseId,
      version: nextVersion,
      storageKey,
      sha256,
      snapshotData: templateData as any,
    },
  });

  // 4. Update case status if in earlier stage
  if (
    caseRecord.status === CaseStatus.NEW_CASE ||
    caseRecord.status === CaseStatus.INTERVIEW_IN_PROGRESS ||
    caseRecord.status === CaseStatus.AI_DRAFT_GENERATED ||
    caseRecord.status === CaseStatus.CITIZEN_VERIFICATION
  ) {
    const oldStatus = caseRecord.status;
    const newStatus = CaseStatus.READY_FOR_LAWYER;

    await prisma.case.update({
      where: { id: caseId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    await prisma.caseStatusHistory.create({
      data: {
        caseId,
        oldStatus,
        newStatus,
        note: `Generated Case Packet Dossier v${nextVersion}. Case is ready for lawyer consultation.`,
      },
    });
  }

  
  if (caseRecord.ownerId) {
    await createNotification({
      userId: caseRecord.ownerId,
      type: NotificationType.CASE_UPDATE,
      title: "Case Packet Dossier Ready",
      message: `Legal case packet dossier v${nextVersion} has been generated and sealed.`,
      link: `/dashboard/cases/${caseId}`,
    }).catch((err) => logger.warn({ err: err.message }, "Could not trigger packet generation notification"));
  }

  logger.info({ caseId, version: nextVersion, packetId: packet.id }, "Case packet generated successfully");

  return packet;
}
