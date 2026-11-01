import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  AiRunType,
  CaseStatus,
  ProcessingStatus,
  StatementType,
  VerificationStatus,
} from "@prisma/client";
import { validateCaseSources } from "../services/ai/provenanceValidator.js";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 7: AI Case Analysis, Timeline Extraction & Citizen Verification", () => {
  const ts = Date.now();
  const citizenAuthId1 = `auth_citizen_ai_${ts}`;
  const citizenAuthId2 = `auth_citizen_ai_other_${ts}`;
  const citizenToken1 = createTestToken({ sub: citizenAuthId1, email: `citizen.ai.${ts}@example.com`, name: "Ramesh Sharma" });
  const citizenToken2 = createTestToken({ sub: citizenAuthId2, email: `other.citizen.ai.${ts}@example.com`, name: "Suresh Gupta" });

  let citizen1UserId: string;
  let citizen2UserId: string;
  let categoryId: string;
  let testCaseId: string;
  let testEvidenceId: string;
  let testStatementId: string;
  let extractedEventId: string;

  beforeAll(async () => {
    // 1. Setup Category
    let cat = await prisma.caseCategory.findFirst({
      where: { slug: "labour-employment" },
    });
    if (!cat) {
      cat = await prisma.caseCategory.create({
        data: {
          slug: "labour-employment",
          name: "Labour and Employment Disputes",
          description: "Unpaid wages, wrongful termination, and gratuity claims",
        },
      });
    }
    categoryId = cat.id;

    // 2. Provision Citizens
    const user1 = await prisma.user.create({
      data: {
        authUserId: citizenAuthId1,
        email: `citizen.ai.${Date.now()}@example.com`,
        fullName: "Ramesh Sharma",
        role: "CITIZEN",
      },
    });
    citizen1UserId = user1.id;

    const user2 = await prisma.user.create({
      data: {
        authUserId: citizenAuthId2,
        email: `other.citizen.ai.${Date.now()}@example.com`,
        fullName: "Suresh Gupta",
        role: "CITIZEN",
      },
    });
    citizen2UserId = user2.id;

    // 3. Create Test Case for Citizen 1
    const newCase = await prisma.case.create({
      data: {
        caseNumber: `NP-2026-AI${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Wrongful Withholding of Salary and Notice Period Compensation",
        description: "Employer stopped paying salary after notice period was served.",
        ownerId: citizen1UserId,
        categoryId: categoryId,
        status: CaseStatus.NEW_CASE,
      },
    });
    testCaseId = newCase.id;

    // 4. Create an Evidence record for the case
    const ev = await prisma.evidence.create({
      data: {
        originalName: "employment_contract.pdf",
        mimeType: "application/pdf",
        fileSize: BigInt(1048576),
        fileType: "PDF",
        storageKey: `cases/${testCaseId}/evidence/contract.pdf`,
        sha256: "a".repeat(64),
        processingStatus: ProcessingStatus.COMPLETED,
        extractedText: "Appointment Letter dated 15 Jan 2024. Monthly remuneration Rs. 90,000/-. Notice period 30 days.",
        case: { connect: { id: testCaseId } },
        uploadedBy: { connect: { id: citizen1UserId } },
      },
    });
    testEvidenceId = ev.id;

    // 5. Create a Statement record for the case
    const stmt = await prisma.statement.create({
      data: {
        content: "I submitted my formal resignation on 1 June 2024. My employer did not disburse salary for May and June.",
        type: StatementType.TEXT,
        case: { connect: { id: testCaseId } },
        author: { connect: { id: citizen1UserId } },
      },
    });
    testStatementId = stmt.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup created test records
    await prisma.caseVerification.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.timelineEventSource.deleteMany({
      where: { timelineEvent: { caseId: testCaseId } },
    }).catch(() => {});
    await prisma.timelineEvent.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.aiOutputSource.deleteMany({
      where: { aiRun: { caseId: testCaseId } },
    }).catch(() => {});
    await prisma.aiRun.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.statement.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.evidence.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.caseStatusHistory.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.case.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [citizen1UserId, citizen2UserId] } },
    }).catch(() => {});
  }, 30000);

  it("POST /api/v1/cases/:id/ai/analyze runs structured legal analysis and timeline extraction", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/ai/analyze`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summaryRunId).toBeDefined();
    expect(res.body.data.timelineRunId).toBeDefined();
    expect(res.body.data.caseSummary.summary).toBeDefined();
    expect(res.body.data.caseSummary.keyIssues.length).toBeGreaterThan(0);
    expect(res.body.data.caseSummary.reliefSought).toBeDefined();

    // Verify Case status transitioned to AI_DRAFT_GENERATED
    const updatedCase = await prisma.case.findUnique({
      where: { id: testCaseId },
    });
    expect(updatedCase?.status).toBe(CaseStatus.AI_DRAFT_GENERATED);

    // Verify status history
    const history = await prisma.caseStatusHistory.findMany({
      where: { caseId: testCaseId },
      orderBy: { createdAt: "desc" },
    });
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]?.newStatus).toBe(CaseStatus.AI_DRAFT_GENERATED);
  }, 30000);

  it("GET /api/v1/cases/:id/ai/runs returns persisted AI runs with outputs", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCaseId}/ai/runs`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const summaryRun = res.body.data.find(
      (r: any) => r.type === AiRunType.CASE_SUMMARY
    );
    expect(summaryRun).toBeDefined();
    expect(summaryRun.status).toBe(ProcessingStatus.COMPLETED);
    expect(summaryRun.normalizedOutput.summary).toBeDefined();

    const timelineRun = res.body.data.find(
      (r: any) => r.type === AiRunType.TIMELINE_EXTRACTION
    );
    expect(timelineRun).toBeDefined();
    expect(timelineRun.status).toBe(ProcessingStatus.COMPLETED);
  }, 30000);

  it("Anti-Hallucination: Source Provenance Validator detects and strips invalid source IDs", async () => {
    const candidateIds = [
      testEvidenceId,
      testStatementId,
      "c_hallucinated_evidence_id_9999",
      "c_other_case_fake_id_8888",
    ];

    const result = await validateCaseSources(testCaseId, candidateIds);

    expect(result.validEvidenceIds).toContain(testEvidenceId);
    expect(result.validStatementIds).toContain(testStatementId);
    expect(result.invalidIds).toContain("c_hallucinated_evidence_id_9999");
    expect(result.invalidIds).toContain("c_other_case_fake_id_8888");
    expect(result.invalidIds.length).toBe(2);
  }, 30000);

  it("GET /api/v1/cases/:id/timeline returns chronological sequence of events with linked sources", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCaseId}/timeline`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstEvent = res.body.data[0];
    expect(firstEvent.title).toBeDefined();
    expect(firstEvent.verificationStatus).toBeDefined();
    extractedEventId = firstEvent.id;
  }, 30000);

  it("POST /api/v1/cases/:id/timeline creates manual timeline event with validated provenance", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/timeline`)
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        title: "Follow-up Demand Email Sent to HR Director",
        description: "Sent formal request for relieving letter and outstanding salary credits.",
        eventDate: "2024-07-20",
        sourceIds: [testEvidenceId],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Follow-up Demand Email Sent to HR Director");
    expect(res.body.data.sources.length).toBe(1);
    expect(res.body.data.sources[0]?.evidenceId).toBe(testEvidenceId);
  }, 30000);

  it("PATCH /api/v1/cases/:id/timeline/:eventId updates event verification status to CITIZEN_CONFIRMED", async () => {
    expect(extractedEventId).toBeDefined();

    const res = await request(app)
      .patch(`/api/v1/cases/${testCaseId}/timeline/${extractedEventId}`)
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        verificationStatus: VerificationStatus.CITIZEN_CONFIRMED,
        description: "Verified accurate by citizen - appointment agreed on 15 Jan 2024.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe(VerificationStatus.CITIZEN_CONFIRMED);
    expect(res.body.data.description).toContain("Verified accurate by citizen");
  }, 30000);

  it("POST /api/v1/cases/:id/verify generates formal CaseVerification snapshot", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/verify`)
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        verificationNote: "I hereby confirm that all statements, evidence, and timeline entries are accurate.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.snapshotVersion).toBe(1);
    expect(res.body.data.verifiedBy.fullName).toBe("Ramesh Sharma");

    // Retrieve verification snapshots
    const listRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/verifications`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0]?.snapshotVersion).toBe(1);
  }, 30000);

  it("SEC: Blocks unauthorized citizen from analyzing or modifying another citizen's case", async () => {
    const analyzeRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/ai/analyze`)
      .set("Authorization", `Bearer ${citizenToken2}`);

    expect(analyzeRes.status).toBe(403);

    const verifyRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/verify`)
      .set("Authorization", `Bearer ${citizenToken2}`)
      .send({ verificationNote: "Unauthorized attempt" });

    expect(verifyRes.status).toBe(403);
  }, 30000);
});
