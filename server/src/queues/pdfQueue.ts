import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";

export interface PdfGenerationJobData {
  caseId: string;
  userId: string;
}

export const PDF_QUEUE_NAME = "pdf-generation-queue";

export const pdfQueue = new Queue<PdfGenerationJobData>(PDF_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

pdfQueue.on("error", (err) => {
  logger.error({ err: err.message }, "BullMQ PDF Queue error");
});
