import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { checkDbConnection, prisma } from "./lib/prisma.js";
import { checkRedisConnection, redis } from "./lib/redis.js";

async function bootstrap() {
  logger.info({ env: env.NODE_ENV, port: env.PORT }, "Starting NyayaPacket AI Backend...");

  // Verify infrastructure connectivity
  const [db, redisResult] = await Promise.all([
    checkDbConnection(),
    checkRedisConnection(),
  ]);

  if (!db.healthy) {
    logger.warn({ err: db.error }, "Warning: Database connection check failed during startup");
  } else {
    logger.info({ latencyMs: db.latencyMs }, "PostgreSQL connection verified");
  }

  if (!redisResult.healthy) {
    logger.warn({ err: redisResult.error }, "Warning: Redis connection check failed during startup");
  } else {
    logger.info({ latencyMs: redisResult.latencyMs }, "Upstash Redis connection verified");
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 NyayaPacket AI API Server listening on port ${env.PORT}`);
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
    logger.info(`Readiness check: http://localhost:${env.PORT}/ready`);
    logger.info(`Base API: http://localhost:${env.PORT}/api/v1`);
  });

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed.");
        try {
          await prisma.$disconnect();
          logger.info("Prisma disconnected.");
          await redis.quit();
          logger.info("Redis disconnected.");
          logger.info("Graceful shutdown completed.");
          process.exit(0);
        } catch (err: any) {
          logger.error({ err: err.message }, "Error during shutdown");
          process.exit(1);
        }
      });

      // Force exit if shutdown hangs
      setTimeout(() => {
        logger.error("Forceful shutdown after timeout.");
        process.exit(1);
      }, 10000);
    });
  }
}

bootstrap().catch((err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "Fatal error during startup bootstrap");
  process.exit(1);
});
