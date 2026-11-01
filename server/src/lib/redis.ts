import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: Redis | undefined;
}

export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10000,
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
    tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
  });
}

export const redis: Redis = globalThis.redisGlobal ?? createRedisConnection();

if (env.NODE_ENV !== "production") {
  globalThis.redisGlobal = redis;
}

redis.on("error", (err) => {
  logger.error({ err: err.message }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

export async function checkRedisConnection(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;
    return { healthy: pong === "PONG", latencyMs };
  } catch (error: any) {
    logger.error({ err: error.message }, "Redis health check failed");
    return { healthy: false, error: error.message };
  }
}
