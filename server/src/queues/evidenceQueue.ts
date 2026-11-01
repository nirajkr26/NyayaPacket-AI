import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export const EVIDENCE_QUEUE_NAME = "evidence-processing-queue";

export interface EvidenceProcessingJobData {
  evidenceId: string;
  caseId: string;
  fileType: string;
  storageKey: string;
}

export const evidenceQueue = new Queue<EvidenceProcessingJobData>(EVIDENCE_QUEUE_NAME, {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 50,
    },
  },
});

export async function enqueueEvidenceProcessing(data: EvidenceProcessingJobData) {
  // In test mode, skip actual queue dispatch unless testing queue directly
  if (env.NODE_ENV === "test") {
    logger.info({ data }, "Test mode: skipped async evidenceQueue dispatch");
    return { id: `mock-job-${Date.now()}` };
  }

  const job = await evidenceQueue.add("process-evidence", data);
  logger.info({ jobId: job.id, evidenceId: data.evidenceId }, "Enqueued evidence processing job");
  return job;
}
