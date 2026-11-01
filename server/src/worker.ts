import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { redis } from "./lib/redis.js";
import { logger } from "./utils/logger.js";
import { EVIDENCE_QUEUE_NAME } from "./queues/evidenceQueue.js";
import type { EvidenceProcessingJobData } from "./queues/evidenceQueue.js";
import { processDocumentOcr } from "./workers/ocrWorker.js";
import { processAudioTranscription } from "./workers/audioWorker.js";

logger.info("👷 Starting NyayaPacket AI Background Worker process...");

export const evidenceWorker = new Worker<EvidenceProcessingJobData>(
  EVIDENCE_QUEUE_NAME,
  async (job: Job<EvidenceProcessingJobData>) => {
    logger.info({ jobId: job.id, fileType: job.data.fileType }, "Worker processing job");

    if (job.data.fileType === "AUDIO") {
      return processAudioTranscription(job.data.evidenceId, job.data.storageKey);
    } else {
      return processDocumentOcr(job.data.evidenceId, job.data.storageKey);
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
  }
);

evidenceWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Job completed successfully");
});

evidenceWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Job failed");
});

import { createAiAnalysisWorker } from "./workers/aiAnalysisWorker.js";

export const aiAnalysisWorker = createAiAnalysisWorker();

// Graceful shutdown
const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
for (const signal of signals) {
  process.on(signal, async () => {
    logger.info(`Received ${signal}. Closing background workers...`);
    await Promise.all([
      evidenceWorker.close(),
      aiAnalysisWorker.close(),
    ]);
    process.exit(0);
  });
}
