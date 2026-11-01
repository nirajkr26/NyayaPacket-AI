import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { CaseStatus } from "@prisma/client";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 5: AI Interview & Citizen Statements Integration Tests", () => {
  let citizenToken: string;
  let otherCitizenToken: string;
  let citizenUser: any;
  let otherCitizenUser: any;
  let category: any;
  let testCase: any;
  let sessionId: string;
  let createdStatementId: string;

  beforeAll(async () => {
    const ts = Date.now();
    const sub1 = `int-cit-1-${ts}`;
    const sub2 = `int-cit-2-${ts}`;

    citizenToken = createTestToken({ sub: sub1, email: `int1.${ts}@test.local`, name: "Kavita Rao" });
    otherCitizenToken = createTestToken({ sub: sub2, email: `int2.${ts}@test.local`, name: "Manoj Singh" });

    // Provision users
    const res1 = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${citizenToken}`);
    citizenUser = res1.body.data;

    const res2 = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${otherCitizenToken}`);
    otherCitizenUser = res2.body.data;

    category = await prisma.caseCategory.findFirst({ where: { slug: "unpaid-wages" } });

    // Create case for citizen 1
    testCase = await prisma.case.create({
      data: {
        caseNumber: `NP-INT-${ts.toString().slice(-6)}`,
        title: "Unpaid Bonus and Travel Allowances",
        ownerId: citizenUser.id,
        categoryId: category.id,
        status: CaseStatus.NEW_CASE,
      },
    });
  }, 30000);

  afterAll(async () => {
    if (testCase?.id) {
      await prisma.statement.deleteMany({ where: { caseId: testCase.id } });
      await prisma.interviewMessage.deleteMany({
        where: { session: { caseId: testCase.id } },
      });
      await prisma.interviewSession.deleteMany({ where: { caseId: testCase.id } });
      await prisma.caseStatusHistory.deleteMany({ where: { caseId: testCase.id } });
      await prisma.case.deleteMany({ where: { id: testCase.id } });
    }
    const userIds = [citizenUser?.id, otherCitizenUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }, 30000);

  it("POST /interviews starts interview and initializes category greeting", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/interviews`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.messages.length).toBe(1);
    expect(res.body.data.messages[0].role).toBe("AI");
    expect(res.body.data.messages[0].content).toContain("NyayaPacket AI intake assistant");

    sessionId = res.body.data.id;

    // Verify case status progressed to INTERVIEW_IN_PROGRESS
    const dbCase = await prisma.case.findUnique({ where: { id: testCase.id } });
    expect(dbCase?.status).toBe("INTERVIEW_IN_PROGRESS");
  }, 30000);

  it("POST /interviews blocks unauthorized citizen from initiating interview", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/interviews`)
      .set("Authorization", `Bearer ${otherCitizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("POST /interviews/:sessionId/messages exchanges citizen response and AI follow-up", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/interviews/${sessionId}/messages`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        content: "I worked as a Senior QA Engineer from Jan 2024 to Nov 2024. My salary was 85,000 INR per month and the last 2 months remain unpaid.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userMessage.role).toBe("USER");
    expect(res.body.data.aiResponse.role).toBe("AI");
    expect(res.body.data.aiResponse.content).toBeDefined();
  }, 30000);

  it("GET /interviews/:sessionId retrieves complete conversation transcript", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCase.id}/interviews/${sessionId}`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.messages.length).toBe(3); // Greeting + User + AI follow-up
  }, 30000);

  it("POST /interviews/:sessionId/complete concludes session and compiles citizen Statement", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/interviews/${sessionId}/complete`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.content).toContain("Senior QA Engineer");

    createdStatementId = res.body.data.id;

    // Verify session marked inactive
    const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
    expect(session?.isActive).toBe(false);

    // Verify case status moved to EVIDENCE_COLLECTION
    const dbCase = await prisma.case.findUnique({ where: { id: testCase.id } });
    expect(dbCase?.status).toBe("EVIDENCE_COLLECTION");
  }, 30000);

  it("POST and GET /statements allows adding manual statements", async () => {
    // Add manual statement
    const postRes = await request(app)
      .post(`/api/v1/cases/${testCase.id}/statements`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        content: "Factual clarification: The company HR sent an email on 15th Nov confirming delay in salary processing.",
        type: "MANUAL_CORRECTION",
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body.success).toBe(true);

    // List statements
    const getRes = await request(app)
      .get(`/api/v1/cases/${testCase.id}/statements`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(2); // Compiled interview statement + Manual correction
  }, 30000);
});
