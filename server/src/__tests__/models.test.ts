import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDb, closeTestDb, clearTestDb } from '../test/dbHandler';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

describe('Mongoose Models: User and AuditLog', () => {
  beforeAll(async () => {
    await connectTestDb();
    await User.init();
    await AuditLog.init();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await User.init();
  });

  describe('User Model', () => {
    it('creates a citizen user with defaults (role=citizen, isActive=true)', async () => {
      const user = await User.create({
        name: 'Aarav Sharma',
        email: 'AARAV@EXAMPLE.COM',
        passwordHash: 'hashed_password_sample_123',
      });

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Aarav Sharma');
      // Email should be normalized to lowercase
      expect(user.email).toBe('aarav@example.com');
      expect(user.role).toBe('citizen');
      expect(user.isActive).toBe(true);
      expect(user.barCouncilId).toBeUndefined();
    });

    it('creates a lawyer user with optional barCouncilId', async () => {
      const lawyer = await User.create({
        name: 'Advocate Priya Roy',
        email: 'priya.roy@bar.in',
        passwordHash: 'hashed_password_sample_456',
        role: 'lawyer',
        barCouncilId: 'MAH/1234/2018',
      });

      expect(lawyer.role).toBe('lawyer');
      expect(lawyer.barCouncilId).toBe('MAH/1234/2018');
    });

    it('rejects invalid roles outside citizen, lawyer, volunteer, admin', async () => {
      await expect(
        User.create({
          name: 'Invalid User',
          email: 'invalid@example.com',
          passwordHash: 'hashed_123',
          role: 'superadmin' as any,
        })
      ).rejects.toThrow();
    });

    it('enforces email uniqueness', async () => {
      await User.create({
        name: 'First User',
        email: 'test@example.com',
        passwordHash: 'hash1',
      });

      // Try creating duplicate with different case
      await expect(
        User.create({
          name: 'Second User',
          email: 'TEST@example.com',
          passwordHash: 'hash2',
        })
      ).rejects.toThrow();
    });
  });

  describe('AuditLog Model (Append-Only Enforcement)', () => {
    it('creates an immutable audit log entry', async () => {
      const entry = await AuditLog.create({
        action: 'auth.login.success',
        role: 'citizen',
        ip: '127.0.0.1',
        metadata: { browser: 'Chrome' },
      });

      expect(entry._id).toBeDefined();
      expect(entry.action).toBe('auth.login.success');
      expect(entry.createdAt).toBeDefined();
    });

    it('blocks updating an existing audit log entry', async () => {
      const entry = await AuditLog.create({
        action: 'auth.register',
        role: 'citizen',
        ip: '127.0.0.1',
      });

      await expect(
        AuditLog.updateOne({ _id: entry._id }, { action: 'tampered.action' })
      ).rejects.toThrow(/append-only/i);
    });

    it('blocks deleting an audit log entry', async () => {
      const entry = await AuditLog.create({
        action: 'auth.register',
        role: 'citizen',
        ip: '127.0.0.1',
      });

      await expect(AuditLog.deleteOne({ _id: entry._id })).rejects.toThrow(/append-only/i);
    });
  });
});
