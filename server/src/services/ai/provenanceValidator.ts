import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";
import type { TimelineExtractionOutput } from "./aiProvider.js";

export interface ProvenanceValidationResult {
  validEvidenceIds: string[];
  validStatementIds: string[];
  invalidIds: string[];
}

/**
 * Validates a list of source IDs against the database to ensure they actually belong to the specified case.
 * Prevents LLM hallucinated IDs or malicious cross-case references from contaminating the database.
 */
export async function validateCaseSources(
  caseId: string,
  candidateIds: string[]
): Promise<ProvenanceValidationResult> {
  const uniqueCandidateIds = Array.from(new Set(candidateIds.filter(Boolean)));

  if (uniqueCandidateIds.length === 0) {
    return { validEvidenceIds: [], validStatementIds: [], invalidIds: [] };
  }

  // 1. Check existing Evidence for this case
  const matchingEvidence = await prisma.evidence.findMany({
    where: {
      caseId,
      id: { in: uniqueCandidateIds },
    },
    select: { id: true },
  });

  const validEvidenceIds = matchingEvidence.map((e) => e.id);
  const remainingIds = uniqueCandidateIds.filter((id) => !validEvidenceIds.includes(id));

  // 2. Check existing Statements for this case
  let validStatementIds: string[] = [];
  if (remainingIds.length > 0) {
    const matchingStatements = await prisma.statement.findMany({
      where: {
        caseId,
        id: { in: remainingIds },
      },
      select: { id: true },
    });
    validStatementIds = matchingStatements.map((s) => s.id);
  }

  const allValidIds = new Set([...validEvidenceIds, ...validStatementIds]);
  const invalidIds = uniqueCandidateIds.filter((id) => !allValidIds.has(id));

  if (invalidIds.length > 0) {
    logger.warn(
      { caseId, invalidCount: invalidIds.length, invalidIds },
      "Detected hallucinated or cross-case source IDs during provenance verification"
    );
  }

  return {
    validEvidenceIds,
    validStatementIds,
    invalidIds,
  };
}

/**
 * Sanitizes timeline events by filtering out any sourceIds that do not belong to the case.
 */
export async function sanitizeTimelineEvents(
  caseId: string,
  events: TimelineExtractionOutput["events"]
): Promise<
  Array<{
    date: string;
    title: string;
    description: string;
    validEvidenceIds: string[];
    validStatementIds: string[];
  }>
> {
  const allSourceIds = events.flatMap((e) => e.sourceIds || []);
  const provenance = await validateCaseSources(caseId, allSourceIds);

  const validEvidenceSet = new Set(provenance.validEvidenceIds);
  const validStatementSet = new Set(provenance.validStatementIds);

  return events.map((event) => ({
    date: event.date,
    title: event.title,
    description: event.description,
    validEvidenceIds: (event.sourceIds || []).filter((id) => validEvidenceSet.has(id)),
    validStatementIds: (event.sourceIds || []).filter((id) => validStatementSet.has(id)),
  }));
}
