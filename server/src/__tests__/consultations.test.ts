import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  CaseStatus,
  ConsultationMode,
  ConsultationStatus,
  LawyerVerificationStatus,
  ProcessingStatus,
  UserRole,
} from "@prisma/client";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 10: Consultations & Scoped Case Sharing Integration Tests", () => {
  const ts = Date.now();
  const citizenAuthId1 = `auth_citizen_csl_${ts}`;
  const citizenAuthId2 = `auth_citizen_csl_other_${ts}`;
  const lawyerAuthId = `auth_lawyer_csl_${ts}`;

  const citizenToken1 = createTestToken({
    sub: citizenAuthId1,
    email: `citizen.csl.${ts}@example.com`,
    name: "Pooja Hegde",
    role: "CITIZEN",
  });
  const citizenToken2 = createTestToken({
    sub: citizenAuthId2,
    email: `other.csl.${ts}@example.com`,
    name: "Rajesh Varma",
    role: "CITIZEN",
  });
  const lawyerToken = createTestToken({
    sub: lawyerAuthId,
    email: `adv.csl.${ts}@example.com`,
    name: "Adv. Siddharth Nair",
    role: "LAWYER",
  });

  let citizen1UserId: string;
  let citizen2UserId: string;
  let lawyerUserId: string;
  let lawyerProfileId: string;
  let categoryId: string;
  let testCaseId: string;
  let testEvidenceId: string;
  let createdConsultationId: string;
  let createdGrantId: string;

  beforeAll(async () => {
    // 1. Setup Category
    let cat = await prisma.caseCategory.findFirst({
      where: { slug: "property-tenancy" },
    });
    if (!cat) {
      cat = await prisma.caseCategory.create({
        data: {
          slug: "property-tenancy",
          name: "Property & Tenancy Disputes",
          description: "Illegal evictions, deposit withholding, and title disputes",
        },
      });
    }
    categoryId = cat.id;

    // 2. Setup Citizens
    const c1 = await prisma.user.create({
      data: {
        authUserId: citizenAuthId1,
        email: `citizen.csl.${ts}@example.com`,
        fullName: "Pooja Hegde",
        role: UserRole.CITIZEN,
      },
    });
    citizen1UserId = c1.id;

    const c2 = await prisma.user.create({
      data: {
        authUserId: citizenAuthId2,
        email: `other.csl.${ts}@example.com`,
        fullName: "Rajesh Varma",
        role: UserRole.CITIZEN,
      },
    });
    citizen2UserId = c2.id;

    // 3. Setup Lawyer
    const lUser = await prisma.user.create({
      data: {
        authUserId: lawyerAuthId,
        email: `adv.csl.${ts}@example.com`,
        fullName: "Adv. Siddharth Nair",
        role: UserRole.LAWYER,
      },
    });
    lawyerUserId = lUser.id;

    const lProfile = await prisma.lawyerProfile.create({
      data: {
        userId: lawyerUserId,
        barCouncilNumber: `KER/${ts.toString().slice(-4)}/2015`,
        stateBarCouncil: "Bar Council of Kerala",
        enrollmentYear: 2015,
        city: "Kochi",
        state: "Kerala",
        verificationStatus: LawyerVerificationStatus.APPROVED,
        isListed: true,
      },
    });
    lawyerProfileId = lProfile.id;

    // 4. Setup Case for Citizen 1
    const testCase = await prisma.case.create({
      data: {
        caseNumber: `NP-2026-CSL${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Unlawful Eviction Notice and Security Deposit Forfeiture",
        description: "Landlord locked premises and withheld 2 lakhs security deposit.",
        ownerId: citizen1UserId,
        categoryId: categoryId,
        status: CaseStatus.READY_FOR_LAWYER,
      },
    });
    testCaseId = testCase.id;

    // 5. Setup Evidence
    const ev = await prisma.evidence.create({
      data: {
        originalName: "lease_agreement.pdf",
        mimeType: "application/pdf",
        fileSize: BigInt(1048576),
        fileType: "PDF",
        storageKey: `cases/${testCaseId}/evidence/lease.pdf`,
        sha256: "c".repeat(64),
        processingStatus: ProcessingStatus.COMPLETED,
        extractedText: "Residential Tenancy Agreement dated 1 Aug 2023. Security deposit Rs. 2,00,000/-.",
        case: { connect: { id: testCaseId } },
        uploadedBy: { connect: { id: citizen1UserId } },
      },
    });
    testEvidenceId = ev.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await prisma.accessGrant.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.consultationRequest.deleteMany({
      where: { citizenId: citizen1UserId },
    }).catch(() => {});
    await prisma.evidence.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.case.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    await prisma.lawyerProfile.deleteMany({
      where: { id: lawyerProfileId },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [citizen1UserId, citizen2UserId, lawyerUserId] } },
    }).catch(() => {});
  }, 30000);

  it("POST /api/v1/consultations creates pending consultation request with verified lawyer", async () => {
    const res = await request(app)
      .post("/api/v1/consultations")
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        lawyerProfileId,
        caseId: testCaseId,
        mode: ConsultationMode.ONLINE,
        preferredAt: "2026-11-10T10:00:00Z",
        citizenMessage: "Please review my lease agreement and wrongful eviction notice.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ConsultationStatus.PENDING);
    expect(res.body.data.citizenMessage).toContain("lease agreement");
    createdConsultationId = res.body.data.id;
  }, 30000);

  it("GET /api/v1/consultations/my lists consultation for Citizen", async () => {
    const res = await request(app)
      .get("/api/v1/consultations/my")
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]?.id).toBe(createdConsultationId);
  }, 30000);

  it("GET /api/v1/consultations/lawyer lists consultation for Advocate", async () => {
    const res = await request(app)
      .get("/api/v1/consultations/lawyer")
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const target = res.body.data.find((c: any) => c.id === createdConsultationId);
    expect(target).toBeDefined();
    expect(target.citizen.fullName).toBe("Pooja Hegde");
  }, 30000);

  it("PATCH /api/v1/consultations/:id/respond lawyer accepts consultation with meeting details", async () => {
    const res = await request(app)
      .patch(`/api/v1/consultations/${createdConsultationId}/respond`)
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        status: ConsultationStatus.ACCEPTED,
        scheduledAt: "2026-11-10T11:00:00Z",
        meetingLink: "https://meet.google.com/abc-defg-hij",
        lawyerResponse: "Accepted. Please have the original rent receipts available during the call.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(ConsultationStatus.ACCEPTED);
    expect(res.body.data.meetingLink).toBe("https://meet.google.com/abc-defg-hij");
  }, 30000);

  it("POST /api/v1/cases/:id/grants creates scoped access grant for Advocate", async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/grants`)
      .set("Authorization", `Bearer ${citizenToken1}`)
      .send({
        lawyerProfileId,
        canViewSummary: true,
        canViewEvidence: true,
        canDownload: false, // Explicitly no download rights
        expiresInDays: 14,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.canViewSummary).toBe(true);
    expect(res.body.data.canViewEvidence).toBe(true);
    expect(res.body.data.canDownload).toBe(false);
    createdGrantId = res.body.data.id;
  }, 30000);

  it("Scoped Permission: Lawyer can view case details but CANNOT download evidence", async () => {
    // 1. Lawyer views case details -> Allowed
    const caseRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}`)
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(caseRes.status).toBe(200);
    expect(caseRes.body.data.title).toContain("Unlawful Eviction");

    // 2. Lawyer views evidence list -> Allowed
    const eviRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/evidence`)
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(eviRes.status).toBe(200);
    expect(eviRes.body.data.length).toBeGreaterThan(0);

    // 3. Lawyer attempts download -> Blocked (canDownload: false -> 403 Forbidden)
    const downRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/evidence/${testEvidenceId}/download`)
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(downRes.status).toBe(403);
  }, 30000);

  it("Immediate Revocation: Revoking grant immediately blocks Lawyer access (403)", async () => {
    // Citizen revokes grant
    const revokeRes = await request(app)
      .delete(`/api/v1/cases/${testCaseId}/grants/${createdGrantId}`)
      .set("Authorization", `Bearer ${citizenToken1}`);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);
    expect(revokeRes.body.data.revokedAt).toBeDefined();

    // Immediate check: Lawyer accesses case -> Blocked with 403 Forbidden
    const blockedRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}`)
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(blockedRes.status).toBe(403);
  }, 30000);

  it("SEC: Blocks unauthorized citizen from issuing or revoking grants for another case", async () => {
    const grantRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/grants`)
      .set("Authorization", `Bearer ${citizenToken2}`)
      .send({ lawyerProfileId });

    expect(grantRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/cases/${testCaseId}/grants/${createdGrantId}`)
      .set("Authorization", `Bearer ${citizenToken2}`);

    expect(deleteRes.status).toBe(403);
  }, 30000);
});
