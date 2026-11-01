import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../utils/logger.js";

export interface AiAnalysisJobData {
  caseId: string;
  userId: string;
}

export const AI_ANALYSIS_QUEUE_NAME = "ai-analysis-queue";

export const aiAnalysisQueue = new Queue<AiAnalysisJobData>(AI_ANALYSIS_QUEUE_NAME, {
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

aiAnalysisQueue.on("error", (err) => {
  logger.error({ err: err.message }, "BullMQ AI Analysis Queue error");
});
