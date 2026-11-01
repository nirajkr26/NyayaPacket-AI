import { Redis } from "ioredis";
import dns from "dns";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

declare global {
  // eslint-disable-next-line no-var
  var redisGlobal: Redis | undefined;
}

export function createRedisConnection(): Redis {
  const options: any = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 15000,
    keepAlive: 30000,
    family: 4,
    // Custom single-IP lookup bypasses Bun's multi-address internalConnectMultipleTimeout crash bug
    lookup: (hostname: string, _options: any, callback: (err: Error | null, address: string, family: number) => void) => {
      dns.lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },
    retryStrategy(times: number) {
      return Math.min(times * 200, 3000);
    },
    tls: env.REDIS_URL.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
  };

  return new Redis(env.REDIS_URL, options);
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
