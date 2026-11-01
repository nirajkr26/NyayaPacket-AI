import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";
import {
  ActionItemStatus,
  CaseStatus,
  CommentVisibility,
  LawyerVerificationStatus,
  UserRole,
} from "@prisma/client";

function createTestToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), ...payload })).toString("base64url");
  const signature = "test-signature";
  return `${header}.${body}.${signature}`;
}

describe("Phase 11: Lawyer Collaboration Workspace, Private Notes & Action Plans", () => {
  const ts = Date.now();
  const citizenAuthId = `auth_citizen_collab_${ts}`;
  const lawyerAuthId = `auth_lawyer_collab_${ts}`;
  const otherCitizenAuthId = `auth_other_collab_${ts}`;

  const citizenToken = createTestToken({
    sub: citizenAuthId,
    email: `citizen.collab.${ts}@example.com`,
    name: "Meera Sen",
    role: "CITIZEN",
  });
  const lawyerToken = createTestToken({
    sub: lawyerAuthId,
    email: `adv.collab.${ts}@example.com`,
    name: "Adv. Arjun Reddy",
    role: "LAWYER",
  });
  const otherCitizenToken = createTestToken({
    sub: otherCitizenAuthId,
    email: `other.collab.${ts}@example.com`,
    name: "Gaurav Roy",
    role: "CITIZEN",
  });

  let citizenUserId: string;
  let lawyerUserId: string;
  let otherCitizenUserId: string;
  let lawyerProfileId: string;
  let categoryId: string;
  let testCaseId: string;
  let createdGrantId: string;
  let createdActionItemId: string;

  beforeAll(async () => {
    // 1. Setup Category
    let cat = await prisma.caseCategory.findFirst({
      where: { slug: "civil-recovery" },
    });
    if (!cat) {
      cat = await prisma.caseCategory.create({
        data: {
          slug: "civil-recovery",
          name: "Debt Recovery & Summary Suits",
          description: "Order 37 summary suits, promissory note dishonour, and commercial debts",
        },
      });
    }
    categoryId = cat.id;

    // 2. Setup Users
    const cit = await prisma.user.create({
      data: {
        authUserId: citizenAuthId,
        email: `citizen.collab.${ts}@example.com`,
        fullName: "Meera Sen",
        role: UserRole.CITIZEN,
      },
    });
    citizenUserId = cit.id;

    const law = await prisma.user.create({
      data: {
        authUserId: lawyerAuthId,
        email: `adv.collab.${ts}@example.com`,
        fullName: "Adv. Arjun Reddy",
        role: UserRole.LAWYER,
      },
    });
    lawyerUserId = law.id;

    const other = await prisma.user.create({
      data: {
        authUserId: otherCitizenAuthId,
        email: `other.collab.${ts}@example.com`,
        fullName: "Gaurav Roy",
        role: UserRole.CITIZEN,
      },
    });
    otherCitizenUserId = other.id;

    // 3. Setup Lawyer Profile
    const lp = await prisma.lawyerProfile.create({
      data: {
        userId: lawyerUserId,
        barCouncilNumber: `TS/${ts.toString().slice(-4)}/2016`,
        stateBarCouncil: "Bar Council of Telangana",
        enrollmentYear: 2016,
        city: "Hyderabad",
        state: "Telangana",
        verificationStatus: LawyerVerificationStatus.APPROVED,
        isListed: true,
      },
    });
    lawyerProfileId = lp.id;

    // 4. Setup Case
    const c = await prisma.case.create({
      data: {
        caseNumber: `NP-2026-COL${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Commercial Recovery Suit for Unpaid Vendor Invoices",
        description: "Vendor delivered construction supplies worth Rs. 8.5 lakhs. Cheques dishonoured.",
        ownerId: citizenUserId,
        categoryId: categoryId,
        status: CaseStatus.READY_FOR_LAWYER,
      },
    });
    testCaseId = c.id;

    // 5. Setup Access Grant
    const grant = await prisma.accessGrant.create({
      data: {
        caseId: testCaseId,
        lawyerProfileId,
        grantedById: citizenUserId,
        canViewSummary: true,
        canViewEvidence: true,
        canDownload: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdGrantId = grant.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await prisma.actionItem.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.caseComment.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.accessGrant.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
    await prisma.case.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    await prisma.lawyerProfile.deleteMany({
      where: { id: lawyerProfileId },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [citizenUserId, lawyerUserId, otherCitizenUserId] } },
    }).catch(() => {});
  }, 30000);

  it("GET /api/v1/lawyers/me/shared-cases lists shared case in Advocate Workspace", async () => {
    const res = await request(app)
      .get("/api/v1/lawyers/me/shared-cases")
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const target = res.body.data.find((g: any) => g.case.id === testCaseId);
    expect(target).toBeDefined();
    expect(target.permissions.canViewSummary).toBe(true);
    expect(target.case.title).toContain("Commercial Recovery Suit");
  }, 30000);

  it("POST /api/v1/cases/:id/comments records comments with visibility flags", async () => {
    // 1. Lawyer posts SHARED_WITH_CITIZEN comment
    const l1Res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        content: "Please provide the bank memo showing cheque return reason.",
        visibility: CommentVisibility.SHARED_WITH_CITIZEN,
      });
    expect(l1Res.status).toBe(201);
    expect(l1Res.body.data.visibility).toBe(CommentVisibility.SHARED_WITH_CITIZEN);

    // 2. Lawyer posts PRIVATE_LAWYER_NOTE
    const l2Res = await request(app)
      .post(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        content: "Legal strategy note: Limitation period expires in 45 days. Must file Section 138 NI Act complaint immediately.",
        visibility: CommentVisibility.PRIVATE_LAWYER_NOTE,
      });
    expect(l2Res.status).toBe(201);
    expect(l2Res.body.data.visibility).toBe(CommentVisibility.PRIVATE_LAWYER_NOTE);

    // 3. Citizen posts SHARED_WITH_CITIZEN comment
    const cRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        content: "I have uploaded the bank return memo dated 12 October.",
        visibility: CommentVisibility.SHARED_WITH_CITIZEN,
      });
    expect(cRes.status).toBe(201);

    // 4. Citizen attempting to post PRIVATE_LAWYER_NOTE is blocked (403)
    const blockRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        content: "Attempting private note as citizen",
        visibility: CommentVisibility.PRIVATE_LAWYER_NOTE,
      });
    expect(blockRes.status).toBe(403);
  }, 30000);

  it("Privacy Guard: Citizen can ONLY view shared comments while Lawyer views all", async () => {
    // 1. Lawyer views comments -> sees all 3 comments
    const lawyerRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${lawyerToken}`);

    expect(lawyerRes.status).toBe(200);
    expect(lawyerRes.body.data.length).toBe(3);
    const hasPrivate = lawyerRes.body.data.some(
      (c: any) => c.visibility === CommentVisibility.PRIVATE_LAWYER_NOTE
    );
    expect(hasPrivate).toBe(true);

    // 2. Citizen views comments -> receives ONLY 2 SHARED_WITH_CITIZEN comments
    const citizenRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(citizenRes.status).toBe(200);
    expect(citizenRes.body.data.length).toBe(2);
    const citizenHasPrivate = citizenRes.body.data.some(
      (c: any) => c.visibility === CommentVisibility.PRIVATE_LAWYER_NOTE
    );
    expect(citizenHasPrivate).toBe(false);
  }, 30000);

  it("Action Items Lifecycle: Create, track status, and complete action items", async () => {
    // 1. Lawyer creates action item
    const createRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/action-items`)
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        title: "Draft Section 138 Statutory Legal Demand Notice",
        description: "Draft 15-day demand notice under Negotiable Instruments Act to drawer.",
        dueDate: "2026-11-20T00:00:00Z",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe(ActionItemStatus.TODO);
    expect(createRes.body.data.title).toContain("Section 138");
    createdActionItemId = createRes.body.data.id;

    // 2. Citizen lists action items
    const listRes = await request(app)
      .get(`/api/v1/cases/${testCaseId}/action-items`)
      .set("Authorization", `Bearer ${citizenToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);

    // 3. Lawyer updates action item to COMPLETED
    const patchRes = await request(app)
      .patch(`/api/v1/cases/${testCaseId}/action-items/${createdActionItemId}`)
      .set("Authorization", `Bearer ${lawyerToken}`)
      .send({
        status: ActionItemStatus.COMPLETED,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe(ActionItemStatus.COMPLETED);
    expect(patchRes.body.data.completedAt).toBeDefined();
  }, 30000);

  it("SEC: Blocks unauthorized citizen from collaborating on another case", async () => {
    const commentRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/comments`)
      .set("Authorization", `Bearer ${otherCitizenToken}`)
      .send({ content: "Intruder comment" });
    expect(commentRes.status).toBe(403);

    const actionRes = await request(app)
      .post(`/api/v1/cases/${testCaseId}/action-items`)
      .set("Authorization", `Bearer ${otherCitizenToken}`)
      .send({ title: "Intruder action item" });
    expect(actionRes.status).toBe(403);
  }, 30000);
});
