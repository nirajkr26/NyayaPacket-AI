import { describe, it, expect, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

describe("Phase 1: Backend Foundation & Health Probes", () => {

  it("GET /health returns 200 and liveness payload", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(typeof res.body.data.uptimeSeconds).toBe("number");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("GET /ready returns 200 and verifies DB + Redis readiness", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ready");
    expect(res.body.data.dependencies.database.healthy).toBe(true);
    expect(res.body.data.dependencies.redis.healthy).toBe(true);
  });

  it("GET /api/v1 returns 200 operational message", async () => {
    const res = await request(app).get("/api/v1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe("1.0.0");
  });

  it("GET /api/v1/health returns 200 on mounted v1 route", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });

  it("GET /unknown-path returns 404 with standard error envelope", async () => {
    const res = await request(app).get("/unknown-path");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(res.body.message).toContain("Cannot GET /unknown-path");
  });
});
