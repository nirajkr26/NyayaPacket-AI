import { Worker, type Job } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";
import { PDF_QUEUE_NAME, type PdfGenerationJobData } from "../queues/pdfQueue.js";
import { generateCasePacket } from "../services/pdf/packetService.js";

export function createPdfWorker(): Worker<PdfGenerationJobData> {
  const worker = new Worker<PdfGenerationJobData>(
    PDF_QUEUE_NAME,
    async (job: Job<PdfGenerationJobData>) => {
      const { caseId, userId } = job.data;
      logger.info({ jobId: job.id, caseId, userId }, "Processing PDF packet generation job");

      try {
        const result = await generateCasePacket(caseId, userId);
        return result;
      } catch (err: any) {
        logger.error({ jobId: job.id, caseId, err: err.message }, "PDF packet generation job failed");
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, caseId: job.data.caseId }, "PDF generation job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, caseId: job?.data.caseId, err: err.message }, "PDF generation job failed in worker");
  });

  return worker;
}
