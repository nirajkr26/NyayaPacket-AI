import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { UserRole, LawyerVerificationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { canAccessCase } from "../services/authz/canAccessCase.js";
import { logAuditEvent } from "../services/audit/auditLogger.js";

describe("Phase 3: Release-Blocking Security & Authorization Suite", () => {
  let citizenA: any;
  let citizenB: any;
  let lawyerPending: any;
  let lawyerApproved: any;
  let adminUser: any;
  let testCategory: any;
  let caseA: any;

  beforeAll(async () => {
    // 1. Ensure a case category exists
    testCategory = await prisma.caseCategory.upsert({
      where: { slug: "unpaid-wages" },
      update: {},
      create: {
        name: "Unpaid Wages",
        slug: "unpaid-wages",
      },
    });

    const timestamp = Date.now();

    // 2. Create Citizen A
    citizenA = await prisma.user.create({
      data: {
        authUserId: `sec-cit-a-${timestamp}`,
        email: `cit-a-${timestamp}@test.local`,
        fullName: "Citizen Alice",
        role: UserRole.CITIZEN,
        isActive: true,
      },
    });

    // 3. Create Citizen B
    citizenB = await prisma.user.create({
      data: {
        authUserId: `sec-cit-b-${timestamp}`,
        email: `cit-b-${timestamp}@test.local`,
        fullName: "Citizen Bob",
        role: UserRole.CITIZEN,
        isActive: true,
      },
    });

    // 4. Create Lawyer (Pending)
    lawyerPending = await prisma.user.create({
      data: {
        authUserId: `sec-law-pending-${timestamp}`,
        email: `law-pending-${timestamp}@test.local`,
        fullName: "Advocate Pending",
        role: UserRole.LAWYER,
        isActive: true,
        lawyerProfile: {
          create: {
            barCouncilNumber: `PND-${timestamp.toString().slice(-6)}`,
            stateBarCouncil: "Delhi",
            enrollmentYear: 2020,
            city: "Delhi",
            state: "Delhi",
            verificationStatus: LawyerVerificationStatus.PENDING,
          },
        },
      },
      include: { lawyerProfile: true },
    });

    // 5. Create Lawyer (Approved)
    lawyerApproved = await prisma.user.create({
      data: {
        authUserId: `sec-law-approved-${timestamp}`,
        email: `law-approved-${timestamp}@test.local`,
        fullName: "Advocate Approved",
        role: UserRole.LAWYER,
        isActive: true,
        lawyerProfile: {
          create: {
            barCouncilNumber: `APP-${timestamp.toString().slice(-6)}`,
            stateBarCouncil: "Karnataka",
            enrollmentYear: 2015,
            city: "Bengaluru",
            state: "Karnataka",
            verificationStatus: LawyerVerificationStatus.APPROVED,
            isListed: true,
            isAvailable: true,
          },
        },
      },
      include: { lawyerProfile: true },
    });

    // 6. Create Admin
    adminUser = await prisma.user.create({
      data: {
        authUserId: `sec-admin-${timestamp}`,
        email: `admin-${timestamp}@test.local`,
        fullName: "Security Admin",
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    // 7. Create Case owned by Citizen A
    caseA = await prisma.case.create({
      data: {
        caseNumber: `NP-TEST-${timestamp.toString().slice(-6)}`,
        title: "Withheld Salary Dispute",
        ownerId: citizenA.id,
        categoryId: testCategory.id,
      },
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup created test records
    if (caseA?.id) {
      await prisma.accessGrant.deleteMany({ where: { caseId: caseA.id } });
      await prisma.case.delete({ where: { id: caseA.id } });
    }
    const lawyerIds = [lawyerPending?.id, lawyerApproved?.id].filter(Boolean);
    if (lawyerIds.length > 0) {
      await prisma.lawyerProfile.deleteMany({
        where: { userId: { in: lawyerIds } },
      });
    }
    const userIds = [citizenA?.id, citizenB?.id, lawyerPending?.id, lawyerApproved?.id, adminUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  }, 30000);

  it("SEC-03: Blocks inactive/suspended user from accessing case", async () => {
    const suspendedUser = { ...citizenA, isActive: false };
    const result = await canAccessCase({
      user: suspendedUser,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("ACCOUNT_SUSPENDED");
    expect(result.statusCode).toBe(403);
  });

  it("SEC-04: Citizen ownership policy — Citizen A accesses own case successfully", async () => {
    const result = await canAccessCase({
      user: citizenA,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(true);
    expect(result.caseData?.id).toBe(caseA.id);
  });

  it("SEC-04: Citizen isolation (Anti-IDOR) — Citizen B is blocked from Citizen A's case", async () => {
    const result = await canAccessCase({
      user: citizenB,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CASE_ACCESS_DENIED");
    expect(result.statusCode).toBe(403);
  });

  it("SEC-05: Lawyer verification gate — Pending lawyer is blocked from shared case", async () => {
    const result = await canAccessCase({
      user: lawyerPending,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("LAWYER_NOT_APPROVED");
    expect(result.statusCode).toBe(403);
  });

  it("SEC-07: Approved lawyer without an explicit AccessGrant is blocked", async () => {
    const result = await canAccessCase({
      user: lawyerApproved,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CASE_ACCESS_DENIED");
    expect(result.statusCode).toBe(403);
  });

  it("SEC-08: Approved lawyer with active valid grant is granted access", async () => {
    // Create active grant
    const grant = await prisma.accessGrant.create({
      data: {
        caseId: caseA.id,
        lawyerProfileId: lawyerApproved.lawyerProfile.id,
        grantedById: citizenA.id,
        canViewSummary: true,
        canViewEvidence: true,
        canDownload: false,
      },
    });

    const result = await canAccessCase({
      user: lawyerApproved,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(true);

    // Clean up grant
    await prisma.accessGrant.delete({ where: { id: grant.id } });
  });

  it("SEC-09: Immediate Revocation — Revoked grant immediately blocks lawyer access", async () => {
    // Create grant that was revoked
    const grant = await prisma.accessGrant.create({
      data: {
        caseId: caseA.id,
        lawyerProfileId: lawyerApproved.lawyerProfile.id,
        grantedById: citizenA.id,
        canViewSummary: true,
        canViewEvidence: true,
        canDownload: true,
        revokedAt: new Date(),
      },
    });

    const result = await canAccessCase({
      user: lawyerApproved,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("GRANT_REVOKED");
    expect(result.statusCode).toBe(403);

    await prisma.accessGrant.delete({ where: { id: grant.id } });
  });

  it("SEC-10: Expiration Enforcement — Expired grant blocks lawyer access", async () => {
    // Create grant with past expiry date
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    const grant = await prisma.accessGrant.create({
      data: {
        caseId: caseA.id,
        lawyerProfileId: lawyerApproved.lawyerProfile.id,
        grantedById: citizenA.id,
        canViewSummary: true,
        canViewEvidence: true,
        expiresAt: pastDate,
      },
    });

    const result = await canAccessCase({
      user: lawyerApproved,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(result.allowed).toBe(false);
    expect(result.code).toBe("GRANT_EXPIRED");
    expect(result.statusCode).toBe(403);

    await prisma.accessGrant.delete({ where: { id: grant.id } });
  });

  it("SEC-11: Scoped Permission Enforcement — Download blocked if canDownload is false", async () => {
    const grant = await prisma.accessGrant.create({
      data: {
        caseId: caseA.id,
        lawyerProfileId: lawyerApproved.lawyerProfile.id,
        grantedById: citizenA.id,
        canViewSummary: true,
        canViewEvidence: true,
        canDownload: false, // Explicitly no download
      },
    });

    // View is allowed
    const viewResult = await canAccessCase({
      user: lawyerApproved,
      caseId: caseA.id,
      scope: "VIEW_EVIDENCE",
    });
    expect(viewResult.allowed).toBe(true);

    // Download is blocked
    const downloadResult = await canAccessCase({
      user: lawyerApproved,
      caseId: caseA.id,
      scope: "DOWNLOAD_EVIDENCE",
    });
    expect(downloadResult.allowed).toBe(false);
    expect(downloadResult.code).toBe("DOWNLOAD_NOT_PERMITTED");
    expect(downloadResult.statusCode).toBe(403);

    await prisma.accessGrant.delete({ where: { id: grant.id } });
  });

  it("SEC-12: Admin Privacy Guard — Admins are blocked from citizen legal evidence by default", async () => {
    // Admin viewing metadata/summary is allowed
    const summaryResult = await canAccessCase({
      user: adminUser,
      caseId: caseA.id,
      scope: "VIEW_CASE_SUMMARY",
    });
    expect(summaryResult.allowed).toBe(true);

    // Admin viewing raw evidence is blocked
    const evidenceResult = await canAccessCase({
      user: adminUser,
      caseId: caseA.id,
      scope: "VIEW_EVIDENCE",
    });
    expect(evidenceResult.allowed).toBe(false);
    expect(evidenceResult.code).toBe("ADMIN_EVIDENCE_RESTRICTED");
    expect(evidenceResult.statusCode).toBe(403);

    // Admin downloading raw evidence is blocked
    const downloadResult = await canAccessCase({
      user: adminUser,
      caseId: caseA.id,
      scope: "DOWNLOAD_EVIDENCE",
    });
    expect(downloadResult.allowed).toBe(false);
    expect(downloadResult.code).toBe("ADMIN_EVIDENCE_RESTRICTED");
    expect(downloadResult.statusCode).toBe(403);
  });

  it("SEC-14: Audit Logging — Generates immutable security audit trail", async () => {
    const auditRecord = await logAuditEvent({
      actorId: adminUser.id,
      action: "LAWYER_VERIFICATION_APPROVED",
      resourceType: "LAWYER_PROFILE",
      resourceId: lawyerApproved.lawyerProfile.id,
      metadata: { reason: "Bar Council certificate verified" },
    });

    expect(auditRecord).toBeDefined();
    expect(auditRecord?.action).toBe("LAWYER_VERIFICATION_APPROVED");
    expect(auditRecord?.resourceType).toBe("LAWYER_PROFILE");

    // Clean up audit record
    if (auditRecord) {
      await prisma.auditLog.delete({ where: { id: auditRecord.id } });
    }
  });
});
