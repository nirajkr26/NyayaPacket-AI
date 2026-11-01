import { LawyerVerificationStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";

export interface ListLawyersParams {
  city?: string;
  state?: string;
  practiceArea?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listPublicLawyers(params: ListLawyersParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 12));
  const skip = (page - 1) * limit;

  const where: Prisma.LawyerProfileWhereInput = {
    verificationStatus: LawyerVerificationStatus.APPROVED,
    isListed: true,
    user: {
      isActive: true,
    },
  };

  if (params.city) {
    where.city = { contains: params.city, mode: "insensitive" };
  }

  if (params.state) {
    where.state = { contains: params.state, mode: "insensitive" };
  }

  if (params.practiceArea) {
    where.practiceAreas = {
      some: {
        practiceArea: {
          OR: [
            { slug: { equals: params.practiceArea, mode: "insensitive" } },
            { name: { contains: params.practiceArea, mode: "insensitive" } },
          ],
        },
      },
    };
  }

  if (params.search) {
    where.OR = [
      { bio: { contains: params.search, mode: "insensitive" } },
      { user: { fullName: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [total, lawyers] = await Promise.all([
    prisma.lawyerProfile.count({ where }),
    prisma.lawyerProfile.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
          },
        },
        practiceAreas: {
          include: {
            practiceArea: true,
          },
        },
        availability: {
          where: { isActive: true },
        },
      },
      orderBy: [{ experienceYears: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return {
    lawyers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPublicLawyerById(id: string) {
  const lawyer = await prisma.lawyerProfile.findFirst({
    where: {
      id,
      verificationStatus: LawyerVerificationStatus.APPROVED,
      user: { isActive: true },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      practiceAreas: {
        include: {
          practiceArea: true,
        },
      },
      availability: {
        where: { isActive: true },
      },
    },
  });

  return lawyer;
}
