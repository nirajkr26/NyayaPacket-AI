import { z } from "zod";

export const CaseSummarySchema = z.object({
  summary: z.string().describe("Factual, neutral legal synthesis of the dispute under Indian law"),
  keyIssues: z.array(z.string()).describe("List of core legal disputes and statutory issues"),
  reliefSought: z
    .union([z.string(), z.array(z.string()).transform((arr) => arr.join("; "))])
    .describe("The primary remedies, damages, or restitution sought by the citizen"),
  strengths: z.array(z.string()).default([]).describe("Legal and factual strengths based on substantiated evidence"),
  weaknesses: z.array(z.string()).default([]).describe("Potential legal vulnerabilities, limitation issues, or gaps"),
  missingInformation: z.array(z.string()).default([]).describe("Crucial missing documents, dates, or witnesses needed for court readiness"),
  sourceCitations: z.array(
    z.object({
      sourceId: z.string(),
      sourceType: z.preprocess((val) => {
        const u = String(val || "").toUpperCase();
        return u.includes("STATE") ? "STATEMENT" : "EVIDENCE";
      }, z.enum(["EVIDENCE", "STATEMENT"])),
      note: z.string().optional(),
    })
  ).default([]),
});

export type CaseSummaryOutput = z.infer<typeof CaseSummarySchema>;

export const TimelineEventSchema = z.object({
  date: z.string().describe("ISO date (YYYY-MM-DD) or approximate date of the incident"),
  title: z.string().describe("Concise event title"),
  description: z.string().describe("Detailed description of what occurred"),
  sourceIds: z.array(z.string()).default([]).describe("IDs of evidence documents or statements supporting this event"),
});

export const TimelineExtractionSchema = z.object({
  events: z.array(TimelineEventSchema),
});

export type TimelineExtractionOutput = z.infer<typeof TimelineExtractionSchema>;

export interface ILLMProvider {
  name: string;
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemInstruction?: string
  ): Promise<T>;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
}
