import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });

if (env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export async function checkDbConnection(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { healthy: true, latencyMs };
  } catch (error: any) {
    logger.error({ err: error.message }, "Database health check failed");
    return { healthy: false, error: error.message };
  }
}
