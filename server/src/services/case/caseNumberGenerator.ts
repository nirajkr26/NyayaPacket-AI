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

  let nextSequence = (count + 1).toString().padStart(4, "0");
  let candidate = `${yearPrefix}${nextSequence}`;

  // Loop with collision check up to 5 times to ensure complete uniqueness
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.case.findUnique({
      where: { caseNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    // Generate random 4-digit suffix on collision
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${yearPrefix}${randomSuffix}`;
    attempts++;
  }

  // Fallback with timestamp slice
  return `${yearPrefix}${Date.now().toString().slice(-4)}`;
}
