import { Worker, type Job } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";
import {
  AI_ANALYSIS_QUEUE_NAME,
  type AiAnalysisJobData,
} from "../queues/aiAnalysisQueue.js";
import { runCaseAnalysis } from "../services/ai/caseAnalysisService.js";

export function createAiAnalysisWorker(): Worker<AiAnalysisJobData> {
  const worker = new Worker<AiAnalysisJobData>(
    AI_ANALYSIS_QUEUE_NAME,
    async (job: Job<AiAnalysisJobData>) => {
      const { caseId, userId } = job.data;
      logger.info({ jobId: job.id, caseId, userId }, "Processing AI analysis job");

      try {
        const result = await runCaseAnalysis(caseId, userId);
        return result;
      } catch (err: any) {
        logger.error({ jobId: job.id, caseId, err: err.message }, "AI analysis job failed");
        throw err;
      }
    },
    {
      connection: redis,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, caseId: job.data.caseId }, "AI analysis job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, caseId: job?.data.caseId, err: err.message }, "AI analysis job failed in worker");
  });

  return worker;
}
