import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDb, closeTestDb, clearTestDb } from '../test/dbHandler';
import { User } from '../models/User';
import { seedDatabase } from '../seed';

describe('Database Seed Script', () => {
  beforeAll(async () => {
    await connectTestDb();
    await User.init();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await User.init();
  });

  it('creates two fictional demo users (citizen and lawyer) idempotently', async () => {
    const result = await seedDatabase({ silent: true });
    expect(result.createdCount).toBe(2);

    const citizen = await User.findOne({ email: 'aarav.citizen@nyayapacket.demo' });
    expect(citizen).toBeDefined();
    expect(citizen?.role).toBe('citizen');
    expect(citizen?.name).toBe('Aarav Sharma');

    const lawyer = await User.findOne({ email: 'priya.lawyer@nyayapacket.demo' });
    expect(lawyer).toBeDefined();
    expect(lawyer?.role).toBe('lawyer');
    expect(lawyer?.barCouncilId).toBe('MAH/5432/2018');

    // Run a second time to ensure idempotency
    const secondResult = await seedDatabase({ silent: true });
    expect(secondResult.createdCount).toBe(0);
    expect(secondResult.skippedCount).toBe(2);

    const totalUsers = await User.countDocuments();
    expect(totalUsers).toBe(2);
  });
});
