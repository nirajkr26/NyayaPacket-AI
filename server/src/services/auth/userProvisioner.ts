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
    const requestedRole =
      payload.role === "LAWYER" || payload.metadata?.role === "LAWYER"
        ? UserRole.LAWYER
        : payload.role === "ADMIN" || payload.metadata?.role === "ADMIN"
        ? UserRole.ADMIN
        : payload.role === "CITIZEN" || payload.metadata?.role === "CITIZEN"
        ? UserRole.CITIZEN
        : null;

    const updates: any = {};
    if (fullName && fullName !== existingUser.fullName) {
      updates.fullName = fullName;
    }
    if (profileImage && profileImage !== existingUser.profileImage) {
      updates.profileImage = profileImage;
    }
    if (requestedRole && requestedRole !== existingUser.role) {
      updates.role = requestedRole;
    }
    if (payload.metadata?.phone && payload.metadata.phone !== existingUser.phone) {
      updates.phone = payload.metadata.phone;
    }

    if (Object.keys(updates).length > 0) {
      resolvedUser = (await prisma.user.update({
        where: { id: existingUser.id },
        data: updates,
        include: { lawyerProfile: true },
      })) as AuthUserWithProfile;
    }

    // If user is a LAWYER but has no lawyerProfile yet, create one
    if (resolvedUser.role === UserRole.LAWYER && !resolvedUser.lawyerProfile) {
      const barCouncilNumber =
        payload.metadata?.barCouncilNumber || `TEMP-${Date.now().toString().slice(-6)}`;
      const stateBarCouncil =
        payload.metadata?.stateBarCouncil || "Bar Council of Delhi";
      const enrollmentYear =
        payload.metadata?.enrollmentYear || new Date().getFullYear();

      const lp = await prisma.lawyerProfile.create({
        data: {
          userId: resolvedUser.id,
          barCouncilNumber,
          stateBarCouncil,
          enrollmentYear: Number(enrollmentYear),
          city: "New Delhi",
          state: "Delhi",
          verificationStatus: LawyerVerificationStatus.APPROVED,
          isListed: true,
          isAvailable: true,
        },
      });
      resolvedUser.lawyerProfile = lp;
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
    const requestedRole =
      payload.role === "LAWYER" || payload.metadata?.role === "LAWYER"
        ? UserRole.LAWYER
        : payload.role === "ADMIN" || payload.metadata?.role === "ADMIN"
        ? UserRole.ADMIN
        : userByEmail.role;

    const linked = (await prisma.user.update({
      where: { id: userByEmail.id },
      data: {
        authUserId,
        role: requestedRole,
        fullName: fullName || userByEmail.fullName,
        profileImage: userByEmail.profileImage || profileImage,
      },
      include: { lawyerProfile: true },
    })) as AuthUserWithProfile;

    if (linked.role === UserRole.LAWYER && !linked.lawyerProfile) {
      const lp = await prisma.lawyerProfile.create({
        data: {
          userId: linked.id,
          barCouncilNumber: payload.metadata?.barCouncilNumber || `TEMP-${Date.now().toString().slice(-6)}`,
          stateBarCouncil: payload.metadata?.stateBarCouncil || "Bar Council of Delhi",
          enrollmentYear: Number(payload.metadata?.enrollmentYear || new Date().getFullYear()),
          city: "New Delhi",
          state: "Delhi",
          verificationStatus: LawyerVerificationStatus.APPROVED,
          isListed: true,
          isAvailable: true,
        },
      });
      linked.lawyerProfile = lp;
    }

    userCache.set(authUserId, { user: linked, expiresAt: Date.now() + 60_000 });
    return linked;
  }

  // 3. Provision new User
  // Determine desired registration role from trusted token claims (defaults to CITIZEN)
  const isLawyerRegistration =
    payload.role === "LAWYER" || payload.metadata?.role === "LAWYER";
  const isAdminRegistration =
    payload.role === "ADMIN" || payload.metadata?.role === "ADMIN";
  const assignedRole = isLawyerRegistration
    ? UserRole.LAWYER
    : isAdminRegistration
    ? UserRole.ADMIN
    : UserRole.CITIZEN;

  logger.info({ authUserId, email, role: assignedRole }, "Provisioning new application user");

  try {
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          authUserId,
          email,
          fullName,
          phone: payload.metadata?.phone || null,
          profileImage,
          role: assignedRole,
          isActive: true,
        },
      });

      // If lawyer registration, create initial LawyerProfile
      if (assignedRole === UserRole.LAWYER) {
        await tx.lawyerProfile.create({
          data: {
            userId: createdUser.id,
            barCouncilNumber:
              payload.metadata?.barCouncilNumber || `TEMP-${Date.now().toString().slice(-6)}`,
            stateBarCouncil:
              payload.metadata?.stateBarCouncil || "Bar Council of Delhi",
            enrollmentYear: Number(payload.metadata?.enrollmentYear || new Date().getFullYear()),
            city: "New Delhi",
            state: "Delhi",
            verificationStatus: LawyerVerificationStatus.APPROVED,
            isListed: true,
            isAvailable: true,
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
