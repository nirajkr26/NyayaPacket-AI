import { CaseStatus, CasePriority } from "@prisma/client";
import type { User, Case, CaseParty } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { generateCaseNumber } from "./caseNumberGenerator.js";
import { logAuditEvent } from "../audit/auditLogger.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors.js";

export interface CreateCaseInput {
  title: string;
  categoryId: string;
  description?: string | null;
  priority?: CasePriority;
  incidentDate?: string | Date | null;
  city?: string | null;
  state?: string | null;
  parties?: Array<{
    name: string;
    relationship?: string | null;
    organization?: string | null;
    contactInfo?: string | null;
    description?: string | null;
  }>;
}

export interface UpdateCaseInput {
  title?: string;
  description?: string | null;
  priority?: CasePriority;
  status?: CaseStatus;
  incidentDate?: string | Date | null;
  city?: string | null;
  state?: string | null;
  statusNote?: string | null;
}

export interface ListCasesFilter {
  ownerId?: string;
  lawyerProfileId?: string;
  status?: CaseStatus;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function createCase(user: User, input: CreateCaseInput) {
  // 1. Verify Category exists
  const category = await prisma.caseCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category || !category.isActive) {
    throw new ValidationError("Invalid or inactive case category ID");
  }

  const incidentDate = input.incidentDate ? new Date(input.incidentDate) : null;

  // 2. Atomic transaction to create Case, initial StatusHistory, and initial Parties with collision retry
  let attempts = 0;
  let newCase: Case | null = null;

  while (attempts < 3) {
    const caseNumber = await generateCaseNumber();
    try {
      newCase = await prisma.$transaction(
        async (tx) => {
          const created = await tx.case.create({
            data: {
              caseNumber,
              title: input.title.trim(),
              description: input.description?.trim() || null,
              ownerId: user.id,
              categoryId: input.categoryId,
              status: CaseStatus.NEW_CASE,
              priority: input.priority || CasePriority.NORMAL,
              incidentDate,
              city: input.city?.trim() || null,
              state: input.state?.trim() || null,
              statusHistory: {
                create: {
                  changedById: user.id,
                  newStatus: CaseStatus.NEW_CASE,
                  note: "Initial case intake created by citizen",
                },
              },
              ...(input.parties && input.parties.length > 0
                ? {
                    parties: {
                      create: input.parties.map((p) => ({
                        name: p.name.trim(),
                        relationship: p.relationship?.trim() || null,
                        organization: p.organization?.trim() || null,
                        contactInfo: p.contactInfo?.trim() || null,
                        description: p.description?.trim() || null,
                      })),
                    },
                  }
                : {}),
            },
          });

          return created;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );
      break;
    } catch (err: any) {
      if (err?.code === "P2002" && attempts < 2) {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  if (!newCase) {
    throw new Error("Failed to create case due to persistent number collision");
  }

  // Log audit event
  await logAuditEvent({
    actorId: user.id,
    action: "CASE_CREATED",
    resourceType: "CASE",
    resourceId: newCase.id,
    metadata: { caseNumber: newCase.caseNumber, categoryId: input.categoryId },
  });

  return getCaseDetails(newCase.id);
}

export async function listCases(filter: ListCasesFilter) {
  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filter.ownerId) where.ownerId = filter.ownerId;
  if (filter.lawyerProfileId) {
    const now = new Date();
    where.accessGrants = {
      some: {
        lawyerProfileId: filter.lawyerProfileId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    };
  }
  if (filter.status) where.status = filter.status;
  if (filter.categoryId) where.categoryId = filter.categoryId;

  if (filter.search && filter.search.trim().length > 0) {
    const term = filter.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { caseNumber: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            evidence: true,
            timelineEvents: true,
            parties: true,
          },
        },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCaseDetails(caseId: string) {
  const targetCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      parties: {
        orderBy: { name: "asc" },
      },
      owner: {
        select: { id: true, fullName: true, email: true, phone: true },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          changedBy: { select: { id: true, fullName: true, role: true } },
        },
      },
      accessGrants: {
        where: { revokedAt: null },
        include: {
          lawyer: {
            select: {
              id: true,
              barCouncilNumber: true,
              user: { select: { fullName: true } },
            },
          },
        },
      },
      _count: {
        select: {
          evidence: true,
          timelineEvents: true,
          statements: true,
          packets: true,
          comments: true,
        },
      },
    },
  });

  if (!targetCase) {
    throw new NotFoundError("Case not found");
  }

  return targetCase;
}

export async function updateCase(user: User, caseId: string, input: UpdateCaseInput) {
  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!existing) {
    throw new NotFoundError("Case not found");
  }

  if (existing.ownerId !== user.id && user.role !== "ADMIN") {
    throw new ForbiddenError("Only the case owner may update case information", "CASE_ACCESS_DENIED");
  }

  const dataToUpdate: any = {};
  if (input.title !== undefined) dataToUpdate.title = input.title.trim();
  if (input.description !== undefined) dataToUpdate.description = input.description?.trim() || null;
  if (input.priority !== undefined) dataToUpdate.priority = input.priority;
  if (input.incidentDate !== undefined)
    dataToUpdate.incidentDate = input.incidentDate ? new Date(input.incidentDate) : null;
  if (input.city !== undefined) dataToUpdate.city = input.city?.trim() || null;
  if (input.state !== undefined) dataToUpdate.state = input.state?.trim() || null;

  const isStatusChange = input.status && input.status !== existing.status;
  if (isStatusChange) {
    dataToUpdate.status = input.status;
    if (input.status === CaseStatus.CLOSED) {
      dataToUpdate.closedAt = new Date();
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.case.update({
      where: { id: caseId },
      data: dataToUpdate,
    });

    if (isStatusChange) {
      await tx.caseStatusHistory.create({
        data: {
          caseId,
          changedById: user.id,
          oldStatus: existing.status,
          newStatus: input.status!,
          note: input.statusNote?.trim() || "Case status updated",
        },
      });
    }

    return res;
  });

  await logAuditEvent({
    actorId: user.id,
    action: isStatusChange ? "CASE_STATUS_CHANGED" : "CASE_UPDATED",
    resourceType: "CASE",
    resourceId: caseId,
    metadata: { isStatusChange, oldStatus: existing.status, newStatus: input.status },
  });

  return getCaseDetails(updated.id);
}

export async function getCitizenDashboardStats(userId: string) {
  const [totalCases, activeCases, verificationNeeded, consultations, actionItems] =
    await Promise.all([
      prisma.case.count({ where: { ownerId: userId } }),
      prisma.case.count({
        where: {
          ownerId: userId,
          status: { notIn: [CaseStatus.CLOSED, CaseStatus.ARCHIVED] },
        },
      }),
      prisma.case.count({
        where: {
          ownerId: userId,
          status: CaseStatus.CITIZEN_VERIFICATION,
        },
      }),
      prisma.consultationRequest.count({
        where: {
          citizenId: userId,
          status: "PENDING",
        },
      }),
      prisma.actionItem.count({
        where: {
          case: { ownerId: userId },
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
      }),
    ]);

  return {
    totalCases,
    activeCases,
    verificationNeeded,
    pendingConsultations: consultations,
    pendingActionItems: actionItems,
  };
}
