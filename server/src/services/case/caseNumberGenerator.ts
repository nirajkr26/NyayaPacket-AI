import { prisma } from "../../lib/prisma.js";

/**
 * Generates an official unique Case Number in format: NP-YYYY-XXXX (e.g. NP-2026-0001)
 */
export async function generateCaseNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `NP-${currentYear}-`;

  // Count existing cases created in current year to generate sequential suffix
  const count = await prisma.case.count({
    where: {
      caseNumber: {
        startsWith: yearPrefix,
      },
    },
  });

  const nextSequence = (count + 1).toString().padStart(4, "0");
  const caseNumber = `${yearPrefix}${nextSequence}`;

  // Check for collision (in case of concurrent writes)
  const existing = await prisma.case.findUnique({
    where: { caseNumber },
    select: { id: true },
  });

  if (existing) {
    // Fallback to random 4-digit suffix if collision occurs
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${yearPrefix}${randomSuffix}`;
  }

  return caseNumber;
}
