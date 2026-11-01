import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { UserRole, CaseStatus } from "@prisma/client";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 4: Core Case Management Integration Tests", () => {
  let citizenToken1: string;
  let citizenToken2: string;
  let citizenUser1: any;
  let citizenUser2: any;
  let category: any;
  let createdCaseId: string;
  let createdPartyId: string;

  beforeAll(async () => {
    const ts = Date.now();
    const sub1 = `case-cit-1-${ts}`;
    const sub2 = `case-cit-2-${ts}`;

    citizenToken1 = createTestToken({ sub: sub1, email: `cit1.${ts}@test.local`, name: "Rohit Verma" });
    citizenToken2 = createTestToken({ sub: sub2, email: `cit2.${ts}@test.local`, name: "Sneha Patel" });

    // Ensure category exists
    category = await prisma.caseCategory.findFirst({ where: { slug: "unpaid-wages" } });
    if (!category) {
      category = await prisma.caseCategory.create({
        data: {
          name: "Unpaid Wages",
          slug: "unpaid-wages",
          description: "Employment dispute",
        },
      });
    }

    // Provision users by hitting /auth/me
    const res1 = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${citizenToken1}`);
    citizenUser1 = res1.body.data;

    const res2 = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${citizenToken2}`);
    citizenUser2 = res2.body.data;
  }, 30000);

  afterAll(async () => {
    if (createdCaseId) {
      await prisma.caseParty.deleteMany({ where: { caseId: createdCaseId } });
      await prisma.caseStatusHistory.deleteMany({ where: { caseId: createdCaseId } });
      await prisma.case.deleteMany({ where: { id: createdCaseId } });
    }
    const userIds = [citizenUser1?.id, citizenUser2?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }, 30000);

  it("GET /api/v1/categories returns list of active dispute categories", async () => {
    const res = await request(app).get("/api/v1/categories");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.some((c: any) => c.slug === "unpaid-wages")).toBe(true);
  });

  it("POST /api/v1/cases creates a new case with NP-YYYY-XXXX number and initial party", async () => {
    const res = await request(app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        title: "Salary withheld for 3 months by employer",
        categoryId: category.id,
        description: "Employer stopped paying salary after project delivery",
        city: "Bengaluru",
        state: "Karnataka",
        parties: [
          {
            name: "Apex Tech Solutions Pvt Ltd",
            relationship: "Former Employer",
            organization: "Apex Tech Solutions",
            contactInfo: "hr@apextech.example",
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.caseNumber).toMatch(/^NP-\d{4}-\d{4}$/);
    expect(res.body.data.status).toBe("NEW_CASE");
    expect(res.body.data.parties.length).toBe(1);
    expect(res.body.data.parties[0].name).toBe("Apex Tech Solutions Pvt Ltd");

    createdCaseId = res.body.data.id;
    createdPartyId = res.body.data.parties[0].id;
  }, 30000);

  it("GET /api/v1/cases lists citizen's cases and enforces tenant isolation", async () => {
    // Citizen 1 should see their case
    const res1 = await request(app)
      .get("/api/v1/cases")
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.some((c: any) => c.id === createdCaseId)).toBe(true);
    expect(res1.body.pagination).toBeDefined();

    // Citizen 2 should NOT see Citizen 1's case
    const res2 = await request(app)
      .get("/api/v1/cases")
      .set("Authorization", `Bearer ${citizenToken2}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.some((c: any) => c.id === createdCaseId)).toBe(false);
  });

  it("GET /api/v1/cases/:id returns case details for owner", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdCaseId);
    expect(res.body.data.category.slug).toBe("unpaid-wages");
  });

  it("GET /api/v1/cases/:id blocks other citizens with 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set("Authorization", `Bearer ${citizenToken2}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CASE_ACCESS_DENIED");
  });

  it("PATCH /api/v1/cases/:id updates case status and creates StatusHistory entry", async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${createdCaseId}`)
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        status: CaseStatus.INTERVIEW_IN_PROGRESS,
        statusNote: "Citizen began AI intake interview",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("INTERVIEW_IN_PROGRESS");

    // Verify history recorded in database
    const history = await prisma.caseStatusHistory.findMany({
      where: { caseId: createdCaseId },
      orderBy: { createdAt: "desc" },
    });
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0]?.newStatus).toBe("INTERVIEW_IN_PROGRESS");
    expect(history[0]?.oldStatus).toBe("NEW_CASE");
  });

  it("Manages Case Parties: add and delete", async () => {
    // Add another party
    const addRes = await request(app)
      .post(`/api/v1/cases/${createdCaseId}/parties`)
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        name: "Director Rajesh Kumar",
        relationship: "Managing Director",
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.name).toBe("Director Rajesh Kumar");
    const secondPartyId = addRes.body.data.id;

    // List parties
    const listRes = await request(app)
      .get(`/api/v1/cases/${createdCaseId}/parties`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);

    // Remove party
    const delRes = await request(app)
      .delete(`/api/v1/cases/${createdCaseId}/parties/${secondPartyId}`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(delRes.status).toBe(200);
  }, 30000);

  it("GET /api/v1/cases/dashboard/stats returns citizen summary statistics", async () => {
    const res = await request(app)
      .get("/api/v1/cases/dashboard/stats")
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCases).toBeGreaterThanOrEqual(1);
    expect(res.body.data.activeCases).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.pendingConsultations).toBe("number");
  }, 30000);
});
