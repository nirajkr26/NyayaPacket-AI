import { Router } from "express";
import type { Request, Response } from "express";
import { checkDbConnection } from "../lib/prisma.js";
import { checkRedisConnection } from "../lib/redis.js";
import { sendSuccess } from "../utils/response.js";

export const healthRouter = Router();

// Liveness probe
healthRouter.get("/health", (_req: Request, res: Response) => {
  return sendSuccess(
    res,
    {
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    "Service is alive"
  );
});

// Readiness probe
healthRouter.get("/ready", async (_req: Request, res: Response) => {
  const [db, redisResult] = await Promise.all([
    checkDbConnection(),
    checkRedisConnection(),
  ]);

  const isReady = db.healthy && redisResult.healthy;
  const statusCode = isReady ? 200 : 503;

  return res.status(statusCode).json({
    success: isReady,
    message: isReady ? "All services ready" : "One or more dependent services are unavailable",
    data: {
      status: isReady ? "ready" : "degraded",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: {
          healthy: db.healthy,
          latencyMs: db.latencyMs,
          error: db.error,
        },
        redis: {
          healthy: redisResult.healthy,
          latencyMs: redisResult.latencyMs,
          error: redisResult.error,
        },
      },
    },
  });
});
