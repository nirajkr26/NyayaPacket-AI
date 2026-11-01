import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  CaseStatus,
  ProcessingStatus,
  StatementType,
  VerificationStatus,
} from "@prisma/client";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 8: PDF Case Packet Generation Integration Tests", () => {
  const ts = Date.now();
  const citizenAuthId1 = `auth_citizen_pkt_${ts}`;
  const citizenAuthId2 = `auth_citizen_pkt_other_${ts}`;
  const citizenToken1 = createTestToken({
    sub: citizenAuthId1,
    email: `citizen.pkt.${ts}@example.com`,
    name: "Sunita Verma",
  });
  const citizenToken2 = createTestToken({
    sub: citizenAuthId2,
    email: `other.pkt.${ts}@example.com`,
    name: "Vikram Malhotra",
  });

  let citizen1UserId: string;
  let citizen2UserId: string;
  let categoryId: string;
  let testCaseId: string;

  beforeAll(async () => {
    // 1. Setup Category
    let cat = await prisma.caseCategory.findFirst({
      where: { slug: "consumer-dispute" },
    });
    if (!cat) {
      cat = await prisma.caseCategory.create({
        data: {
          slug: "consumer-dispute",
          name: "Consumer Protection & Defective Goods",
          description: "Defective electronics, refund denials, and unfair trade practices",
        },
      });
    }
    categoryId = cat.id;

    // 2. Setup Citizens
    const u1 = await prisma.user.create({
      data: {
        authUserId: citizenAuthId1,
        email: `citizen.pkt.${ts}@example.com`,
        fullName: "Sunita Verma",
        phone: "+919876543210",
        role: "CITIZEN",
      },
    });
    citizen1UserId = u1.id;

    const u2 = await prisma.user.create({
      data: {
        authUserId: citizenAuthId2,
        email: `other.pkt.${ts}@example.com`,
        fullName: "Vikram Malhotra",
        role: "CITIZEN",
      },
    });
    citizen2UserId = u2.id;

    // 3. Create Case
    const c = await prisma.case.create({
      data: {
        caseNumber: `NP-2026-PKT${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Defective Electric Scooter Battery Warranty Repudiation",
        description: "Battery malfunctioned within 3 months of purchase. Dealer refused replacement under warranty.",
        ownerId: citizen1UserId,
        categoryId: categoryId,
        status: CaseStatus.AI_DRAFT_GENERATED,
        city: "Bengaluru",
        state: "Karnataka",
        incidentDate: new Date("2024-05-10"),
      },
    });
    testCaseId = c.id;

    // 4. Create Parties
    await prisma.caseParty.create({
      data: {
        caseId: testCaseId,
        name: "VoltSpeed Mobility Pvt Ltd",
        relationship: "Manufacturer",
      },
    });

    // 5. Create Evidence
    await prisma.evidence.create({
      data: {
        originalName: "scooter_purchase_invoice.pdf",
        mimeType: "application/pdf",
        fileSize: BigInt(524288),
        fileType: "PDF",
        storageKey: `cases/${testCaseId}/evidence/invoice.pdf`,
        sha256: "b".repeat(64),
        processingStatus: ProcessingStatus.COMPLETED,
        extractedText: "Tax Invoice dated 12 Feb 2024. Total Rs. 1,25,000/-. 3-year warranty included.",
        case: { connect: { id: testCaseId } },
        uploadedBy: { connect: { id: citizen1UserId } },
      },
    });

    // 6. Create Timeline Event
    await prisma.timelineEvent.create({
      data: {
        caseId: testCaseId,
        title: "Total Battery Failure on Highway",
        description: "Vehicle abruptly halted and smoke emitted from battery casing.",
        eventDate: new Date("2024-05-10"),
        verificationStatus: VerificationStatus.CITIZEN_CONFIRMED,
      },
    });

    // 7. Create Verification
    await prisma.caseVerification.create({
      data: {
        caseId: testCaseId,
        verifiedById: citizen1UserId,
        snapshotVersion: 1,
        verificationNote: "I have confirmed all battery failure logs and invoice records.",
      },
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup records
    await prisma.packetGeneration.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.caseVerification.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.timelineEventSource.deleteMany({
      where: { timelineEvent: { caseId: testCaseId } },
    }).catch(() => {});
    await prisma.timelineEvent.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.evidence.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.caseParty.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.caseStatusHistory.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.case.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [citizen1UserId, citizen2UserId] } },
    }).catch(() => {});
  }, 30000);

  it("POST /api/v1/cases/:id/packets/generate compiles dossier, stamps SHA-256, and stores packet", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/packets/generate`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.data.storageKey).toBe(`cases/${testCaseId}/packets/packet_v1.pdf`);

    // Verify Case transitioned to READY_FOR_LAWYER
    const c = await prisma.case.findUnique({ where: { id: testCaseId } });
    expect(c?.status).toBe(CaseStatus.READY_FOR_LAWYER);
  }, 30000);

  it("POST /api/v1/cases/:id/packets/generate increments version on subsequent generations", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/packets/generate`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe(2);
    expect(res.body.data.storageKey).toBe(`cases/${testCaseId}/packets/packet_v2.pdf`);
  }, 30000);

  it("GET /api/v1/cases/:id/packets lists all generated packet versions", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCaseId}/packets`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0]?.version).toBe(2);
    expect(res.body.data[1]?.version).toBe(1);
  }, 30000);

  it("GET /api/v1/cases/:id/packets/:version/download returns presigned download URL", async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${testCaseId}/packets/1/download`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.downloadUrl).toBeDefined();
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.sha256).toBeDefined();
  }, 30000);

  it("SEC: Blocks unauthorized citizen from generating or downloading case packets (403)", async () => {
    const genRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/packets/generate`)
      .set("Authorization", `Bearer ${citizenToken2}`);

    expect(genRes.status).toBe(403);

    const downRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/packets/1/download`)
      .set("Authorization", `Bearer ${citizenToken2}`);

    expect(downRes.status).toBe(403);
  }, 30000);
});
