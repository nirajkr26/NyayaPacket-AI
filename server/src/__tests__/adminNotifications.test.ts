import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  CaseStatus,
  NotificationType,
  UserRole,
} from "@prisma/client";
import { createNotification } from "../services/notification/notificationService.js";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 12: Notifications, Admin Portal Backend, Metrics & Security Guard", () => {
  const ts = Date.now();
  const adminAuthId = `auth_admin_p12_${ts}`;
  const citizenAuthId = `auth_citizen_p12_${ts}`;

  const adminToken = createTestToken({
    sub: adminAuthId,
    email: `admin.p12.${ts}@example.com`,
    name: "Platform SuperAdmin",
    role: "ADMIN",
  });
  const citizenToken = createTestToken({
    sub: citizenAuthId,
    email: `citizen.p12.${ts}@example.com`,
    name: "Kiran Mazumdar",
    role: "CITIZEN",
  });

  let adminUserId: string;
  let citizenUserId: string;
  let categoryId: string;
  let testCaseId: string;
  let createdNotificationId: string;

  beforeAll(async () => {
    // 1. Setup Category
    let cat = await prisma.caseCategory.findFirst();
    if (!cat) {
      cat = await prisma.caseCategory.create({
        data: {
          slug: "general-civil",
          name: "General Civil Disputes",
          description: "General civil and contractual claims",
        },
      });
    }
    categoryId = cat.id;

    // 2. Setup Admin and Citizen Users
    const adminUser = await prisma.user.create({
      data: {
        authUserId: adminAuthId,
        email: `admin.p12.${ts}@example.com`,
        fullName: "Platform SuperAdmin",
        role: UserRole.ADMIN,
      },
    });
    adminUserId = adminUser.id;

    const citizenUser = await prisma.user.create({
      data: {
        authUserId: citizenAuthId,
        email: `citizen.p12.${ts}@example.com`,
        fullName: "Kiran Mazumdar",
        role: UserRole.CITIZEN,
      },
    });
    citizenUserId = citizenUser.id;

    // 3. Setup Case
    const c = await prisma.case.create({
      data: {
        caseNumber: `NP-2026-ADM${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Statutory Interest Claim for Delayed Infrastructure Supply",
        ownerId: citizenUserId,
        categoryId: categoryId,
        status: CaseStatus.NEW_CASE,
      },
    });
    testCaseId = c.id;

    // 4. Create Notification
    const notif = await createNotification({
      userId: citizenUserId,
      type: NotificationType.CASE_UPDATE,
      title: "Case Created Successfully",
      message: "Your legal aid intake dossier has been initialized.",
      link: `/cases/${testCaseId}`,
    });
    if (notif) {
      createdNotificationId = notif.id;
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await prisma.notification.deleteMany({
      where: { userId: citizenUserId },
    }).catch(() => {});
    await prisma.auditLog.deleteMany({
      where: { actorId: adminUserId },
    }).catch(() => {});
    await prisma.case.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [adminUserId, citizenUserId] } },
    }).catch(() => {});
  }, 30000);

  it("GET /api/v1/notifications lists notifications and unread count for Citizen", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const target = res.body.data.find((n: any) => n.id === createdNotificationId);
    expect(target).toBeDefined();
    expect(target.isRead).toBe(false);
  }, 30000);

  it("PATCH /api/v1/notifications/:id/read marks notification as read", async () => {
    expect(createdNotificationId).toBeDefined();

    const res = await request(app)
      .patch(`/api/v1/notifications/${createdNotificationId}/read`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRead).toBe(true);
  }, 30000);

  it("GET /api/v1/admin/dashboard/metrics returns system-wide metrics for Admin", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard/metrics")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data.users.citizens).toBeGreaterThanOrEqual(1);
    expect(res.body.data.cases.total).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.packets.total).toBe("number");
  }, 30000);

  it("GET /api/v1/admin/users lists platform users with pagination and search", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users?role=CITIZEN")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.some((u: any) => u.id === citizenUserId);
    expect(found).toBe(true);
  }, 30000);

  it("User Suspension Enforcement: Admin suspends citizen -> citizen blocked from API -> reactivate", async () => {
    // 1. Admin suspends citizen
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${citizenUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isActive: false,
        reason: "Suspended pending identity verification",
      });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isActive).toBe(false);

    // 2. Suspended citizen attempts to access cases -> Blocked with 403 ACCOUNT_SUSPENDED
    const accessRes = await request(app)
      .get("/api/v1/cases")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(accessRes.status).toBe(403);
    expect(accessRes.body.error?.code).toBe("ACCOUNT_SUSPENDED");

    // 3. Admin reactivates citizen
    const reactivateRes = await request(app)
      .patch(`/api/v1/admin/users/${citizenUserId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        isActive: true,
        reason: "Identity confirmed and reactivated",
      });

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.isActive).toBe(true);

    // 4. Reactivated citizen can access cases again
    const restoredRes = await request(app)
      .get("/api/v1/cases")
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(restoredRes.status).toBe(200);
  }, 30000);

  it("Admin Privacy Guard: Admin case monitoring returns metadata only without evidence binaries", async () => {
    const res = await request(app)
      .get("/api/v1/admin/cases")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const targetCase = res.body.data.find((c: any) => c.id === testCaseId);
    expect(targetCase).toBeDefined();
    expect(targetCase.caseNumber).toBeDefined();
    expect(targetCase.category).toBeDefined();
    // Verify evidence binaries and OCR raw dumps are NOT present on metadata endpoint
    expect(targetCase.evidence).toBeUndefined();
    expect(targetCase.statements).toBeUndefined();
  }, 30000);

  it("GET /api/v1/admin/queues/status returns BullMQ queue status counts", async () => {
    const res = await request(app)
      .get("/api/v1/admin/queues/status")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.evidenceQueue).toBeDefined();
    expect(res.body.data.aiAnalysisQueue).toBeDefined();
    expect(res.body.data.pdfQueue).toBeDefined();
  }, 30000);

  it("GET /api/v1/admin/audit-logs retrieves security audit events", async () => {
    const res = await request(app)
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const hasSuspendAction = res.body.data.some(
      (a: any) => a.action === "SUSPEND_USER" || a.action === "REACTIVATE_USER"
    );
    expect(hasSuspendAction).toBe(true);
  }, 30000);

  it("SEC: Non-admin citizen blocked from accessing admin portal endpoints (403)", async () => {
    const res1 = await request(app)
      .get("/api/v1/admin/dashboard/metrics")
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(res1.status).toBe(403);

    const res2 = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(res2.status).toBe(403);

    const res3 = await request(app)
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", `Bearer ${citizenToken}`);
    expect(res3.status).toBe(403);
  }, 30000);
});
