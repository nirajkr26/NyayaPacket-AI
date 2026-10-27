import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { loadConfig } from './config';
import { User } from './models/User';

export const DEMO_CITIZEN = {
  name: 'Aarav Sharma',
  email: 'aarav.citizen@nyayapacket.demo',
  password: 'CitizenPassword123',
  role: 'citizen' as const,
};

export const DEMO_LAWYER = {
  name: 'Advocate Priya Roy',
  email: 'priya.lawyer@nyayapacket.demo',
  password: 'LawyerPassword123',
  role: 'lawyer' as const,
  barCouncilId: 'MAH/5432/2018',
};

interface SeedOptions {
  silent?: boolean;
}

export async function seedDatabase(options: SeedOptions = {}) {
  const { silent = false } = options;
  let createdCount = 0;
  let skippedCount = 0;

  const usersToSeed = [
    {
      ...DEMO_CITIZEN,
      barCouncilId: undefined,
    },
    {
      ...DEMO_LAWYER,
    },
  ];

  for (const item of usersToSeed) {
    const existing = await User.findOne({ email: item.email.toLowerCase() });
    if (existing) {
      if (!silent) {
        console.log(`[Seed] User ${item.email} already exists — skipped.`);
      }
      skippedCount++;
      continue;
    }

    const passwordHash = await bcrypt.hash(item.password, 10);
    await User.create({
      name: item.name,
      email: item.email.toLowerCase(),
      passwordHash,
      role: item.role,
      barCouncilId: item.barCouncilId,
      isActive: true,
    });

    createdCount++;
    if (!silent) {
      console.log(`[Seed] Created ${item.role} account: ${item.email}`);
    }
  }

  return { createdCount, skippedCount };
}

async function runCli() {
  try {
    const config = loadConfig();
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('[Seed] Connected.');

    const result = await seedDatabase({ silent: false });
    console.log('\n======================================================');
    console.log('  NyayaPacket AI — Fictional Demo Accounts Seeded');
    console.log('======================================================');
    console.log('1. Citizen Account:');
    console.log(`   Email:    ${DEMO_CITIZEN.email}`);
    console.log(`   Password: ${DEMO_CITIZEN.password}`);
    console.log(`   Role:     Citizen\n`);
    console.log('2. Lawyer Account:');
    console.log(`   Email:    ${DEMO_LAWYER.email}`);
    console.log(`   Password: ${DEMO_LAWYER.password}`);
    console.log(`   Role:     Lawyer (Bar Council: ${DEMO_LAWYER.barCouncilId})\n`);
    console.log(`Summary: ${result.createdCount} created, ${result.skippedCount} skipped.`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
    process.exit(1);
  }
}

// Run CLI directly if invoked from command line
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  runCli();
}
