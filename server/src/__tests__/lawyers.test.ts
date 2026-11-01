import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  LawyerVerificationStatus,
  UserRole,
  VerificationDocumentStatus,
} from "@prisma/client";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 9: Lawyer Verification & Public Directory Integration Tests", () => {
  const ts = Date.now();
  const adminAuthId = `auth_admin_lawyer_${ts}`;
  const lawyerAuthId = `auth_lawyer_onboard_${ts}`;
  const citizenAuthId = `auth_citizen_dir_${ts}`;

  const adminToken = createTestToken({
    sub: adminAuthId,
    email: `admin.lawyer.${ts}@example.com`,
    name: "Admin Officer",
    role: "ADMIN",
  });
  const lawyerToken = createTestToken({
    sub: lawyerAuthId,
    email: `advocate.${ts}@example.com`,
    name: "Adv. Ananya Deshmukh",
    role: "LAWYER",
  });
  const citizenToken = createTestToken({
    sub: citizenAuthId,
    email: `citizen.dir.${ts}@example.com`,
    name: "Aakash Mehta",
    role: "CITIZEN",
  });

  let adminUserId: string;
  let lawyerUserId: string;
  let citizenUserId: string;
  let practiceAreaId: string;
  let createdProfileId: string;

  beforeAll(async () => {
    // 1. Setup Practice Area
    let area = await prisma.practiceArea.findFirst({
      where: { slug: "labour-service-matters" },
    });
    if (!area) {
      area = await prisma.practiceArea.create({
        data: {
          slug: "labour-service-matters",
          name: "Labour & Service Law",
          description: "Industrial tribunals, wrongful termination, gratuity, and service disputes",
        },
      });
    }
    practiceAreaId = area.id;

    // 2. Setup Users
    const adminUser = await prisma.user.create({
      data: {
        authUserId: adminAuthId,
        email: `admin.lawyer.${ts}@example.com`,
        fullName: "Admin Officer",
        role: UserRole.ADMIN,
      },
    });
    adminUserId = adminUser.id;

    const lawyerUser = await prisma.user.create({
      data: {
        authUserId: lawyerAuthId,
        email: `advocate.${ts}@example.com`,
        fullName: "Adv. Ananya Deshmukh",
        role: UserRole.LAWYER,
      },
    });
    lawyerUserId = lawyerUser.id;

    const citizenUser = await prisma.user.create({
      data: {
        authUserId: citizenAuthId,
        email: `citizen.dir.${ts}@example.com`,
        fullName: "Aakash Mehta",
        role: UserRole.CITIZEN,
      },
    });
    citizenUserId = citizenUser.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup records
    if (createdProfileId) {
      await prisma.auditLog.deleteMany({
        where: { resourceId: createdProfileId },
      }).catch(() => {});
      await prisma.lawyerVerificationDocument.deleteMany({
        where: { lawyerProfileId: createdProfileId },
      }).catch(() => {});
      await prisma.lawyerPracticeArea.deleteMany({
        where: { lawyerProfileId: createdProfileId },
      }).catch(() => {});
      await prisma.lawyerProfile.deleteMany({
        where: { id: createdProfileId },
      }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, lawyerUserId, citizenUserId] } },
    }).catch(() => {});
  }, 30000);

  it("POST /api/v1/lawyers/me/profile creates onboarding profile with PENDING status", async () => {
    const res = await request(app)
      .post("/api/v1/lawyers/me/profile")
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        barCouncilNumber: `MAH/${ts.toString().slice(-4)}/2018`,
        stateBarCouncil: "Bar Council of Maharashtra & Goa",
        enrollmentYear: 2018,
        experienceYears: 6,
        city: "Mumbai",
        state: "Maharashtra",
        bio: "Specializing in employment contracts, wrongful terminations, and high court writ petitions.",
        languages: ["English", "Hindi", "Marathi"],
        practiceAreaIds: [practiceAreaId],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe(LawyerVerificationStatus.PENDING);
    expect(res.body.data.isListed).toBe(false);
    expect(res.body.data.city).toBe("Mumbai");
    createdProfileId = res.body.data.id;
  }, 30000);

  it("POST /api/v1/lawyers/me/documents records verification certificate upload", async () => {
    const res = await request(app)
      .post("/api/v1/lawyers/me/documents")
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        documentType: "BAR_COUNCIL_ENROLLMENT_CERT",
        originalName: "bar_enrollment_certificate.pdf",
        storageKey: `lawyers/${createdProfileId}/documents/cert.pdf`,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(VerificationDocumentStatus.PENDING);
  }, 30000);

  it("Public Directory Isolation: Unapproved lawyer is EXCLUDED from public directory", async () => {
    const res = await request(app).get("/api/v1/lawyers?city=Mumbai");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const found = res.body.data.some((l: any) => l.id === createdProfileId);
    expect(found).toBe(false);

    // Direct fetch of pending lawyer profile returns 404
    const directRes = await request(app).get(`/api/v1/lawyers/${createdProfileId}`);
    expect(directRes.status).toBe(404);
  }, 30000);

  it("GET /api/v1/admin/lawyers/pending returns queue for Admin and blocks Citizen (403)", async () => {
    // Non-admin citizen blocked
    const forbiddenRes = await request(app)
      .get("/api/v1/admin/lawyers/pending")
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(forbiddenRes.status).toBe(403);

    // Admin allowed
    const adminRes = await request(app)
      .get("/api/v1/admin/lawyers/pending")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    const target = adminRes.body.data.find((l: any) => l.id === createdProfileId);
    expect(target).toBeDefined();
    expect(target.verificationDocuments.length).toBeGreaterThan(0);
  }, 30000);

  it("PATCH /api/v1/admin/lawyers/:id/verification approves lawyer and creates audit trail", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/lawyers/${createdProfileId}/verification`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: LawyerVerificationStatus.APPROVED,
        notes: "Bar Council registration credentials verified against official state directory.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationStatus).toBe(LawyerVerificationStatus.APPROVED);
    expect(res.body.data.isListed).toBe(true);

    // Verify document status updated
    const doc = await prisma.lawyerVerificationDocument.findFirst({
      where: { lawyerProfileId: createdProfileId },
    });
    expect(doc?.status).toBe(VerificationDocumentStatus.APPROVED);
    expect(doc?.reviewedById).toBe(adminUserId);

    // Verify security audit log was written
    const audit = await prisma.auditLog.findFirst({
      where: {
        resourceId: createdProfileId,
        action: "APPROVE_LAWYER",
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(adminUserId);
  }, 30000);

  it("Public Directory Search: Approved lawyer is now visible and searchable in directory", async () => {
    const res = await request(app).get("/api/v1/lawyers?city=Mumbai");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const target = res.body.data.find((l: any) => l.id === createdProfileId);
    expect(target).toBeDefined();
    expect(target.user.fullName).toBe("Adv. Ananya Deshmukh");
    expect(target.practiceAreas.length).toBeGreaterThan(0);

    // Direct profile fetch
    const profileRes = await request(app).get(`/api/v1/lawyers/${createdProfileId}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.id).toBe(createdProfileId);
  }, 30000);
});
