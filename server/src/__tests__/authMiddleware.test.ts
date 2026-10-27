import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { connectTestDb, closeTestDb, clearTestDb } from '../test/dbHandler';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { authenticate, requireRole, signAuthToken } from '../middleware/auth';

describe('Auth & RBAC Middleware', () => {
  let app: express.Application;
  let citizenUser: IUser;
  let lawyerUser: IUser;
  let inactiveUser: IUser;

  beforeAll(async () => {
    await connectTestDb();
    await User.init();
    await AuditLog.init();

    // Create a mini Express app to test middlewares
    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Protected routes
    app.get('/test/protected', authenticate, (req: Request, res: Response) => {
      res.json({ message: 'authenticated', user: req.user });
    });

    app.get(
      '/test/citizen-only',
      authenticate,
      requireRole('citizen'),
      (req: Request, res: Response) => {
        res.json({ message: 'citizen granted', user: req.user });
      }
    );

    app.get(
      '/test/lawyer-only',
      authenticate,
      requireRole('lawyer'),
      (req: Request, res: Response) => {
        res.json({ message: 'lawyer granted', user: req.user });
      }
    );
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    citizenUser = await User.create({
      name: 'Aarav Citizen',
      email: 'aarav@citizen.in',
      passwordHash: 'hashed1',
      role: 'citizen',
      isActive: true,
    });

    lawyerUser = await User.create({
      name: 'Priya Lawyer',
      email: 'priya@bar.in',
      passwordHash: 'hashed2',
      role: 'lawyer',
      barCouncilId: 'DL/999/2020',
      isActive: true,
    });

    inactiveUser = await User.create({
      name: 'Blocked User',
      email: 'blocked@test.com',
      passwordHash: 'hashed3',
      role: 'citizen',
      isActive: false,
    });
  });

  it('rejects access without a token cookie (401)', async () => {
    const res = await request(app).get('/test/protected');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/authentication required/i);
  });

  it('rejects access with an invalid/tampered token (401)', async () => {
    const res = await request(app)
      .get('/test/protected')
      .set('Cookie', ['token=invalid_token_xyz']);
    expect(res.status).toBe(401);
  });

  it('rejects an inactive user even with a valid token (401)', async () => {
    const token = signAuthToken(inactiveUser);
    const res = await request(app)
      .get('/test/protected')
      .set('Cookie', [`token=${token}`]);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/account is inactive/i);
  });

  it('authenticates active user and sets req.user', async () => {
    const token = signAuthToken(citizenUser);
    const res = await request(app)
      .get('/test/protected')
      .set('Cookie', [`token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.user._id).toBe(citizenUser._id.toString());
  });

  it('allows access when role matches requireRole requirement', async () => {
    const token = signAuthToken(citizenUser);
    const res = await request(app)
      .get('/test/citizen-only')
      .set('Cookie', [`token=${token}`]);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('citizen granted');
  });

  it('forbids access (403) and logs access.denied when role mismatches', async () => {
    // Citizen attempts to access lawyer-only route
    const token = signAuthToken(citizenUser);
    const res = await request(app)
      .get('/test/lawyer-only')
      .set('Cookie', [`token=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/forbidden/i);

    // Verify access.denied was logged into AuditLog
    const auditLogs = await AuditLog.find({ action: 'access.denied' });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].role).toBe('citizen');
    expect(auditLogs[0].actorId?.toString()).toBe(citizenUser._id.toString());
  });
});
