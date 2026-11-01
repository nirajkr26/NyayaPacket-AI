import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { CaseStatus, EvidenceType } from "@prisma/client";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { processDocumentOcr } from "../workers/ocrWorker.js";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 6: Evidence Management & Document Processing Integration Tests", () => {
  let citizenToken: string;
  let otherCitizenToken: string;
  let citizenUser: any;
  let otherCitizenUser: any;
  let category: any;
  let testCase: any;
  let uploadedStorageKey: string;
  let createdEvidenceId: string;

  beforeAll(async () => {
    const ts = Date.now();
    citizenToken = createTestToken({ sub: `evi-cit-1-${ts}`, email: `evi1.${ts}@test.local`, name: "Kunal Ghosh" });
    otherCitizenToken = createTestToken({ sub: `evi-cit-2-${ts}`, email: `evi2.${ts}@test.local`, name: "Priya Nair" });

    const res1 = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${citizenToken}`);
    citizenUser = res1.body.data;

    const res2 = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${otherCitizenToken}`);
    otherCitizenUser = res2.body.data;

    category = await prisma.caseCategory.findFirst({ where: { slug: "unpaid-wages" } });

    testCase = await prisma.case.create({
      data: {
        caseNumber: `NP-EVI-${ts.toString().slice(-6)}`,
        title: "Salary slips and offer letter evidence test",
        ownerId: citizenUser.id,
        categoryId: category.id,
        status: CaseStatus.EVIDENCE_COLLECTION,
      },
    });
  }, 30000);

  afterAll(async () => {
    if (testCase?.id) {
      await prisma.evidence.deleteMany({ where: { caseId: testCase.id } });
      await prisma.case.deleteMany({ where: { id: testCase.id } });
    }
    const userIds = [citizenUser?.id, otherCitizenUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }, 30000);

  it("POST /upload-url generates presigned upload URL with MIME validation", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/evidence/upload-url`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        originalName: "salary_slip_october.pdf",
        mimeType: "application/pdf",
        fileSize: 1048576, // 1MB
        fileType: EvidenceType.PDF,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadUrl).toBeDefined();
    expect(res.body.data.storageKey).toBeDefined();
    expect(res.body.data.expiresInSeconds).toBe(900);

    uploadedStorageKey = res.body.data.storageKey;
  }, 30000);

  it("POST /upload-url rejects unsupported executable MIME types with 422", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/evidence/upload-url`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        originalName: "malicious_script.exe",
        mimeType: "application/x-msdownload",
        fileSize: 500000,
        fileType: EvidenceType.OTHER,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  }, 30000);

  it("POST /complete persists Evidence record with SHA-256 and queues processing", async () => {
    const sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // Empty hash test sample

    const res = await request(app)
      .post(`/api/v1/cases/${testCase.id}/evidence/complete`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        storageKey: uploadedStorageKey,
        originalName: "salary_slip_october.pdf",
        mimeType: "application/pdf",
        fileSize: 1048576,
        fileType: EvidenceType.PDF,
        sha256,
        description: "Official salary slip for October 2024 showing withheld component",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.sha256).toBe(sha256);
    expect(res.body.data.processingStatus).toBe("QUEUED");

    createdEvidenceId = res.body.data.id;
  }, 30000);

  it("Executes OCR document processing worker and stores extracted content", async () => {
    const ocrResult = await processDocumentOcr(createdEvidenceId, uploadedStorageKey);
    expect(ocrResult.success).toBe(true);

    // Verify database record has extractedText and status COMPLETED
    const dbEvidence = await prisma.evidence.findUnique({ where: { id: createdEvidenceId } });
    expect(dbEvidence?.processingStatus).toBe("COMPLETED");
    expect(dbEvidence?.extractedText).toBeDefined();
    expect(dbEvidence?.processedAt).toBeDefined();
  }, 30000);

  it("GET /evidence lists case evidence for authorized citizen", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCase.id}/evidence`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((e: any) => e.id === createdEvidenceId)).toBe(true);
  }, 30000);

  it("GET /evidence/:evidenceId/download generates short-lived presigned download URL", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCase.id}/evidence/${createdEvidenceId}/download`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.downloadUrl).toBeDefined();
    expect(res.body.data.expiresInSeconds).toBe(900);
  }, 30000);

  it("GET /evidence/:evidenceId/download blocks unauthorized citizen with 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCase.id}/evidence/${createdEvidenceId}/download`)
      .set("Authorization", `Bearer ${otherCitizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  }, 30000);
});
