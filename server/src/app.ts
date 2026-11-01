import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { categoriesRouter } from "./routes/categories.js";
import { casesRouter } from "./routes/cases.js";
import { partiesRouter } from "./routes/parties.js";
import { interviewsRouter } from "./routes/interviews.js";
import { statementsRouter } from "./routes/statements.js";
import { evidenceRouter } from "./routes/evidence.js";
import { aiRouter } from "./routes/ai.js";
import { timelineRouter } from "./routes/timeline.js";
import { sendError } from "./utils/response.js";

export const app = express();

// 1. Security & Perimeter Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  })
);

// 2. Request Identification & Parsing
app.use(requestIdMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3. Request Logging (skip /health and /ready in normal logging)
app.use((req, res, next) => {
  if (req.path === "/health" || req.path === "/ready") {
    return next();
  }
  const start = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        reqId: req.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      "Handled HTTP request"
    );
  });
  next();
});

// 4. Rate Limiting (disabled in test)
if (env.NODE_ENV !== "test") {
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests, please try again later",
      error: { code: "RATE_LIMIT_EXCEEDED", details: null },
    },
  });
  app.use("/api/", limiter);
}

// 5. Mount Health & Readiness Probes
app.use(healthRouter);
app.use("/api/v1", healthRouter);

// 6. Mount Domain API Routers
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/cases", casesRouter);
app.use("/api/v1/cases/:caseId/parties", partiesRouter);
app.use("/api/v1/cases/:caseId/interviews", interviewsRouter);
app.use("/api/v1/cases/:caseId/statements", statementsRouter);
app.use("/api/v1/cases/:caseId/evidence", evidenceRouter);
app.use("/api/v1/cases/:caseId/ai", aiRouter);
app.use("/api/v1/cases/:caseId/timeline", timelineRouter);
app.use("/api/v1/cases/:caseId", timelineRouter); // Supports POST /api/v1/cases/:caseId/verify and GET /api/v1/cases/:caseId/verifications

// 7. Base API v1 Entry Route
const v1Router = express.Router();
v1Router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "NyayaPacket AI API v1 Operational",
    data: {
      version: "1.0.0",
      docs: "/api/v1/docs",
    },
  });
});
app.use("/api/v1", v1Router);

// 7. 404 Route Catch-All
app.use((req, res) => {
  return sendError(
    res,
    "ROUTE_NOT_FOUND",
    `Cannot ${req.method} ${req.originalUrl}`,
    404
  );
});

// 8. Global Centralized Error Handler
app.use(errorHandler);
