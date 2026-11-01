import { UserRole, LawyerVerificationStatus } from "@prisma/client";
import type { User, LawyerProfile } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../utils/logger.js";
import type { VerifiedAuthPayload } from "./tokenVerifier.js";

export type AuthUserWithProfile = User & {
  lawyerProfile?: LawyerProfile | null;
};

interface CachedUserEntry {
  user: AuthUserWithProfile;
  expiresAt: number;
}
const userCache = new Map<string, CachedUserEntry>();

export function clearUserCache(authUserId?: string) {
  if (authUserId) {
    userCache.delete(authUserId);
  } else {
    userCache.clear();
  }
}

export async function getOrProvisionUser(
  payload: VerifiedAuthPayload
): Promise<AuthUserWithProfile> {
  const authUserId = payload.sub;

  // Fast-path: return cached user if retrieved within last 60 seconds
  const cached = userCache.get(authUserId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }

  const email = (payload.email || `${authUserId}@auth.local`).toLowerCase().trim();
  const fullName = payload.name || payload.email?.split("@")[0] || "Citizen User";
  const profileImage = payload.picture || null;

  // 1. Look up existing user by authUserId
  const existingUser = await prisma.user.findUnique({
    where: { authUserId },
    include: { lawyerProfile: true },
  });

  if (existingUser) {
    let resolvedUser = existingUser as AuthUserWithProfile;
    // Optionally update profile details if changed
    if (existingUser.fullName !== fullName || existingUser.profileImage !== profileImage) {
      resolvedUser = (await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: existingUser.fullName || fullName,
          profileImage: existingUser.profileImage || profileImage,
        },
        include: { lawyerProfile: true },
      })) as AuthUserWithProfile;
    }
    userCache.set(authUserId, { user: resolvedUser, expiresAt: Date.now() + 60_000 });
    return resolvedUser;
  }

  // 2. Check if a user with this email already exists without authUserId linked
  const userByEmail = await prisma.user.findUnique({
    where: { email },
    include: { lawyerProfile: true },
  });

  if (userByEmail) {
    logger.info({ userId: userByEmail.id, authUserId }, "Linking existing email user with authUserId");
    const linked = (await prisma.user.update({
      where: { id: userByEmail.id },
      data: {
        authUserId,
        profileImage: userByEmail.profileImage || profileImage,
      },
      include: { lawyerProfile: true },
    })) as AuthUserWithProfile;
    userCache.set(authUserId, { user: linked, expiresAt: Date.now() + 60_000 });
    return linked;
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

    const provisioned = (await prisma.user.findUnique({
      where: { id: newUser.id },
      include: { lawyerProfile: true },
    })) as AuthUserWithProfile;
    userCache.set(authUserId, { user: provisioned, expiresAt: Date.now() + 60_000 });
    return provisioned;
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
        const found = existing as AuthUserWithProfile;
        userCache.set(authUserId, { user: found, expiresAt: Date.now() + 60_000 });
        return found;
      }
    }
    throw err;
  }
}
