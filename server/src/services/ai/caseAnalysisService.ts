import {
  AiRunType,
  CaseStatus,
  ProcessingStatus,
  VerificationStatus,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";
import {
  CaseSummarySchema,
  TimelineExtractionSchema,
  type CaseSummaryOutput,
  type TimelineExtractionOutput,
} from "./aiProvider.js";
import { geminiProvider } from "./geminiProvider.js";
import {
  sanitizeTimelineEvents,
  validateCaseSources,
} from "./provenanceValidator.js";

export async function runCaseAnalysis(caseId: string, _triggeredById?: string) {
  logger.info({ caseId }, "Starting comprehensive AI case analysis and timeline extraction");

  // 1. Fetch case details along with statements, evidence, and parties
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      category: true,
      parties: true,
      statements: true,
      evidence: {
        where: { processingStatus: ProcessingStatus.COMPLETED },
      },
    },
  });

  if (!caseRecord) {
    throw new Error(`Case with ID ${caseId} not found`);
  }

  // Compile context text for the AI
  const statementsText = caseRecord.statements
    .map(
      (s) =>
        `[Statement ID: ${s.id} | Type: ${s.type}]\n${s.content}\n`
    )
    .join("\n");

  const evidenceText = caseRecord.evidence
    .map(
      (e) =>
        `[Evidence ID: ${e.id} | Document: ${e.originalName}${e.description ? ` - ${e.description}` : ""}]\nExtracted Content:\n${e.extractedText || "No text extracted"}\n`
    )
    .join("\n");

  const partiesText = caseRecord.parties
    .map((p) => `- ${p.name} (${p.relationship || "Party"})`)
    .join("\n");

  const legalSystemPrompt = `You are NyayaPacket AI, an expert Indian legal intake and analysis system.
Your job is to objectively analyze the citizen's case, synthesize claims under Indian law, and extract a strictly factual, chronological timeline.
Rules:
1. Ground every legal claim in the facts provided in the statements and evidence documents.
2. Always cite the exact source IDs (Statement ID or Evidence ID) supporting each claim or timeline event.
3. If information is missing or contradictory, explicitly flag it in missingInformation or weaknesses.
4. Do NOT hallucinate legal facts or non-existent document IDs.`;

  const analysisPrompt = `CASE DETAILS:
Title: ${caseRecord.title}
Category: ${caseRecord.category.name}
Description: ${caseRecord.description || "N/A"}
Parties:
${partiesText || "None specified"}

CITIZEN STATEMENTS:
${statementsText || "None provided"}

EVALUATED EVIDENCE & TRANSCRIPTS:
${evidenceText || "No processed evidence documents"}

TASK:
Provide a rigorous legal case summary and identify missing information.
Return a JSON object with the following fields:
- summary: string
- keyIssues: array of strings
- reliefSought: string (or array of strings)
- strengths: array of strings
- weaknesses: array of strings
- missingInformation: array of strings
- sourceCitations: array of { sourceId: string, sourceType: "EVIDENCE" | "STATEMENT", note?: string }
Ground every citation strictly in the Statement IDs or Evidence IDs provided above.`;

  // 2. Perform Case Summary Run
  const summaryAiRun = await prisma.aiRun.create({
    data: {
      caseId,
      type: AiRunType.CASE_SUMMARY,
      provider: geminiProvider.name,
      model: geminiProvider.model,
      promptVersion: "1.0",
      status: ProcessingStatus.PROCESSING,
    },
  });

  let caseSummary: CaseSummaryOutput;
  try {
    caseSummary = await geminiProvider.generateStructured(
      analysisPrompt,
      CaseSummarySchema,
      legalSystemPrompt
    );

    // Validate provenance of any citations in the summary
    const citedIds = caseSummary.sourceCitations.map((c) => c.sourceId);
    const provenance = await validateCaseSources(caseId, citedIds);

    // Record verified output sources
    for (const citation of caseSummary.sourceCitations) {
      if (
        provenance.validEvidenceIds.includes(citation.sourceId) ||
        provenance.validStatementIds.includes(citation.sourceId)
      ) {
        await prisma.aiOutputSource.create({
          data: {
            aiRunId: summaryAiRun.id,
            evidenceId: provenance.validEvidenceIds.includes(citation.sourceId)
              ? citation.sourceId
              : null,
            statementId: provenance.validStatementIds.includes(citation.sourceId)
              ? citation.sourceId
              : null,
            relevanceNote: citation.note,
          },
        });
      }
    }

    await prisma.aiRun.update({
      where: { id: summaryAiRun.id },
      data: {
        status: ProcessingStatus.COMPLETED,
        completedAt: new Date(),
        rawOutput: caseSummary as any,
        normalizedOutput: caseSummary as any,
      },
    });
  } catch (err: any) {
    logger.error({ caseId, err: err.message }, "Error during AI Case Summary generation");
    await prisma.aiRun.update({
      where: { id: summaryAiRun.id },
      data: {
        status: ProcessingStatus.FAILED,
        errorMessage: err.message,
      },
    });
    throw err;
  }

  // 3. Perform Timeline Extraction Run
  const timelineAiRun = await prisma.aiRun.create({
    data: {
      caseId,
      type: AiRunType.TIMELINE_EXTRACTION,
      provider: geminiProvider.name,
      model: geminiProvider.model,
      promptVersion: "1.0",
      status: ProcessingStatus.PROCESSING,
    },
  });

  const timelinePrompt = `Extract a chronological sequence of all critical events from the statements and evidence below.
Return a JSON object with an "events" key containing an array of events with fields:
1. date (YYYY-MM-DD or approximate date)
2. title (concise string)
3. description (detailed explanation)
4. sourceIds (array of valid Statement IDs or Evidence IDs from below).

STATEMENTS:
${statementsText}

EVIDENCE:
${evidenceText}`;

  try {
    const timelineResult: TimelineExtractionOutput =
      await geminiProvider.generateStructured(
        timelinePrompt,
        TimelineExtractionSchema,
        legalSystemPrompt
      );

    // Sanitize events to enforce anti-hallucination and provenance validation
    const sanitizedEvents = await sanitizeTimelineEvents(
      caseId,
      timelineResult.events
    );

    // Clear previous unverified timeline events to prevent duplication on re-runs,
    // while strictly preserving any events that were citizen-confirmed or corrected
    await prisma.timelineEvent.deleteMany({
      where: {
        caseId,
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
    });

    // Insert fresh Timeline Events in the database
    for (const event of sanitizedEvents) {
      let parsedDate: Date | null = null;
      if (event.date) {
        const d = new Date(event.date);
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      const createdEvent = await prisma.timelineEvent.create({
        data: {
          caseId,
          eventDate: parsedDate,
          title: event.title,
          description: event.description,
          verificationStatus: VerificationStatus.UNVERIFIED,
        },
      });

      // Link verified evidence sources
      for (const evId of event.validEvidenceIds) {
        await prisma.timelineEventSource.create({
          data: {
            timelineEventId: createdEvent.id,
            evidenceId: evId,
          },
        });
      }

      // Link verified statement sources
      for (const stId of event.validStatementIds) {
        await prisma.timelineEventSource.create({
          data: {
            timelineEventId: createdEvent.id,
            statementId: stId,
          },
        });
      }

      // Link to AiRun
      await prisma.aiOutputSource.create({
        data: {
          aiRunId: timelineAiRun.id,
          timelineEventId: createdEvent.id,
        },
      });
    }

    await prisma.aiRun.update({
      where: { id: timelineAiRun.id },
      data: {
        status: ProcessingStatus.COMPLETED,
        completedAt: new Date(),
        rawOutput: timelineResult as any,
        normalizedOutput: { events: sanitizedEvents } as any,
      },
    });
  } catch (err: any) {
    logger.error({ caseId, err: err.message }, "Error during AI Timeline Extraction");
    await prisma.aiRun.update({
      where: { id: timelineAiRun.id },
      data: {
        status: ProcessingStatus.FAILED,
        errorMessage: err.message,
      },
    });
    throw err;
  }

  // 4. Update case status if in early stages
  if (
    caseRecord.status === CaseStatus.NEW_CASE ||
    caseRecord.status === CaseStatus.INTERVIEW_IN_PROGRESS ||
    caseRecord.status === CaseStatus.EVIDENCE_COLLECTION
  ) {
    const oldStatus = caseRecord.status;
    const newStatus = CaseStatus.AI_DRAFT_GENERATED;

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
        note: "Automated AI case summarization and timeline extraction completed",
      },
    });
  }

  logger.info({ caseId }, "AI Case analysis and timeline extraction completed successfully");

  return {
    summaryRunId: summaryAiRun.id,
    timelineRunId: timelineAiRun.id,
    caseSummary,
  };
}
