import { describe, it, expect, afterAll, beforeAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

// Helper to create test JWT tokens
function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 2: Authentication & User Provisioning", () => {
  const citizenSub = `test-citizen-${Date.now()}`;
  const citizenEmail = `citizen.${Date.now()}@example.com`;
  const citizenToken = createTestToken({
    sub: citizenSub,
    email: citizenEmail,
    name: "Aarav Sharma",
  });

  const lawyerSub = `test-lawyer-${Date.now()}`;
  const lawyerEmail = `lawyer.${Date.now()}@example.com`;
  const lawyerToken = createTestToken({
    sub: lawyerSub,
    email: lawyerEmail,
    name: "Pooja Hegde",
    role: "LAWYER",
  });

  afterAll(async () => {
    // Clean up created test users
    await prisma.user.deleteMany({
      where: {
        authUserId: { in: [citizenSub, lawyerSub] },
      },
    });
  });

  it("Rejects unauthenticated request with 401 Unauthorized", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("Rejects malformed Authorization header with 401 Unauthorized", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Basic 123456");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("Provisions new Citizen user upon valid authentication token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authUserId).toBe(citizenSub);
    expect(res.body.data.email).toBe(citizenEmail);
    expect(res.body.data.fullName).toBe("Aarav Sharma");
    expect(res.body.data.role).toBe("CITIZEN");
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.permissions).toContain("CASE_CREATE");
    expect(res.body.data.permissions).toContain("CASE_READ_OWN");

    // Verify persisted in PostgreSQL
    const dbUser = await prisma.user.findUnique({
      where: { authUserId: citizenSub },
    });
    expect(dbUser).toBeDefined();
    expect(dbUser?.role).toBe("CITIZEN");
  });

  it("Provisions new Lawyer user and creates PENDING LawyerProfile", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.authUserId).toBe(lawyerSub);
    expect(res.body.data.role).toBe("LAWYER");
    expect(res.body.data.lawyerProfile).toBeDefined();
    expect(res.body.data.lawyerProfile.verificationStatus).toBe("PENDING");
    expect(res.body.data.lawyerProfile.isListed).toBe(false);

    // Verify in PostgreSQL
    const dbLawyer = await prisma.user.findUnique({
      where: { authUserId: lawyerSub },
      include: { lawyerProfile: true },
    });
    expect(dbLawyer?.role).toBe("LAWYER");
    expect(dbLawyer?.lawyerProfile?.verificationStatus).toBe("PENDING");
  });

  it("Allows user to update profile information via PATCH /api/v1/users/me", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        fullName: "Aarav K. Sharma",
        phone: "+919876543210",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe("Aarav K. Sharma");
    expect(res.body.data.phone).toBe("+919876543210");
  });

  it("Prevents privilege escalation: cannot self-assign ADMIN role", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        role: "ADMIN",
        fullName: "Aarav Sharma",
      });

    // Request succeeds for valid fields, but role modification is stripped
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("CITIZEN");

    const dbUser = await prisma.user.findUnique({ where: { authUserId: citizenSub } });
    expect(dbUser?.role).toBe("CITIZEN");
  });

  it("Blocks suspended user with 403 Forbidden (ACCOUNT_SUSPENDED)", async () => {
    // Manually suspend citizen
    await prisma.user.update({
      where: { authUserId: citizenSub },
      data: { isActive: false },
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ACCOUNT_SUSPENDED");

    // Reactivate for cleanup
    await prisma.user.update({
      where: { authUserId: citizenSub },
      data: { isActive: true },
    });
  });
});
