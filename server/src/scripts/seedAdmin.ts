import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => a.startsWith("--email="))?.split("=")[1];
  const nameArg = args.find((a) => a.startsWith("--name="))?.split("=")[1];
  const authIdArg = args.find((a) => a.startsWith("--authId="))?.split("=")[1];

  const email = (emailArg || process.env.ADMIN_SEED_EMAIL || "admin@nyayapacket.ai").toLowerCase().trim();
  const fullName = nameArg || process.env.ADMIN_SEED_NAME || "System Administrator";
  const authUserId = authIdArg || process.env.ADMIN_SEED_AUTH_ID || `admin-${Date.now()}`;

  console.log(`🛡️ Provisioning platform administrator: ${email} (${authUserId})...`);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      isActive: true,
      authUserId,
      fullName,
    },
    create: {
      email,
      fullName,
      authUserId,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log("✅ Platform Administrator successfully provisioned:");
  console.log(`   ID: ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   AuthUserId: ${admin.authUserId}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   Status: ACTIVE`);
}

main()
  .catch((e) => {
    console.error("❌ Admin provisioning failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
