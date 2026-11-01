import { UserRole, LawyerVerificationStatus } from "@prisma/client";
import type { User, LawyerProfile } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";
import type { VerifiedAuthPayload } from "./tokenVerifier.js";

export type AuthUserWithProfile = User & {
  lawyerProfile?: LawyerProfile | null;
};

export async function getOrProvisionUser(
  payload: VerifiedAuthPayload
): Promise<AuthUserWithProfile> {
  const authUserId = payload.sub;
  const email = (payload.email || `${authUserId}@auth.local`).toLowerCase().trim();
  const fullName = payload.name || payload.email?.split("@")[0] || "Citizen User";
  const profileImage = payload.picture || null;

  // 1. Look up existing user by authUserId
  const existingUser = await prisma.user.findUnique({
    where: { authUserId },
    include: { lawyerProfile: true },
  });

  if (existingUser) {
    // Optionally update profile details if changed
    if (existingUser.fullName !== fullName || existingUser.profileImage !== profileImage) {
      return (await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: existingUser.fullName || fullName,
          profileImage: existingUser.profileImage || profileImage,
        },
        include: { lawyerProfile: true },
      })) as AuthUserWithProfile;
    }
    return existingUser;
  }

  // 2. Check if a user with this email already exists without authUserId linked
  const userByEmail = await prisma.user.findUnique({
    where: { email },
    include: { lawyerProfile: true },
  });

  if (userByEmail) {
    logger.info({ userId: userByEmail.id, authUserId }, "Linking existing email user with authUserId");
    return (await prisma.user.update({
      where: { id: userByEmail.id },
      data: {
        authUserId,
        profileImage: userByEmail.profileImage || profileImage,
      },
      include: { lawyerProfile: true },
    })) as AuthUserWithProfile;
  }

  // 3. Provision new User
  // Determine desired registration role from trusted token claims (defaults to CITIZEN)
  const isLawyerRegistration =
    payload.role === "LAWYER" || payload.metadata?.role === "LAWYER";
  const assignedRole = isLawyerRegistration ? UserRole.LAWYER : UserRole.CITIZEN;

  logger.info({ authUserId, email, role: assignedRole }, "Provisioning new application user");

  try {
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          authUserId,
          email,
          fullName,
          profileImage,
          role: assignedRole,
          isActive: true,
        },
      });

      // If lawyer registration, create initial PENDING LawyerProfile
      if (assignedRole === UserRole.LAWYER) {
        await tx.lawyerProfile.create({
          data: {
            userId: createdUser.id,
            barCouncilNumber: `TEMP-${Date.now().toString().slice(-6)}`,
            stateBarCouncil: "Pending Submission",
            enrollmentYear: new Date().getFullYear(),
            city: "Pending",
            state: "Pending",
            verificationStatus: LawyerVerificationStatus.PENDING,
            isListed: false,
            isAvailable: false,
          },
        });
      }

      return createdUser;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return (await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { lawyerProfile: true },
    })) as AuthUserWithProfile;
  } catch (err: any) {
    // Intercept unique constraint collisions from concurrent initial requests
    if (err?.code === "P2002") {
      logger.info({ authUserId, email }, "Concurrent user provisioning detected, retrieving existing record");
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ authUserId }, { email }],
        },
        include: { lawyerProfile: true },
      });
      if (existing) {
        return existing as AuthUserWithProfile;
      }
    }
    throw err;
  }
}
