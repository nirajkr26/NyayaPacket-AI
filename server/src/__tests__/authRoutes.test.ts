import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, closeTestDb, clearTestDb } from '../test/dbHandler';
import { createApp } from '../app';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

describe('Auth & RBAC API Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    await connectTestDb();
    await User.init();
    await AuditLog.init();
    app = createApp();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await User.init();
  });

  describe('POST /api/auth/register', () => {
    it('registers a citizen successfully and sets httpOnly token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Aarav Sharma',
          email: 'aarav@citizen.in',
          password: 'Password123!',
          role: 'citizen',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Aarav Sharma');
      expect(res.body.user.email).toBe('aarav@citizen.in');
      expect(res.body.user.role).toBe('citizen');
      expect(res.body.user.passwordHash).toBeUndefined();

      // Check cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);

      // AuditLog entry
      const audit = await AuditLog.findOne({ action: 'auth.register' });
      expect(audit).toBeDefined();
      expect(audit?.role).toBe('citizen');
    });

    it('registers a lawyer successfully with optional barCouncilId', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Advocate Rajesh',
          email: 'rajesh@lawyer.in',
          password: 'SecretLawyer123',
          role: 'lawyer',
          barCouncilId: 'D/4567/2015',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('lawyer');
      expect(res.body.user.barCouncilId).toBe('D/4567/2015');
    });

    it('rejects registration with role=admin or role=volunteer', async () => {
      const resAdmin = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hacker',
          email: 'admin@attack.com',
          password: 'Password123!',
          role: 'admin',
        });

      expect(resAdmin.status).toBe(400);

      const resVolunteer = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Volunteer',
          email: 'vol@attack.com',
          password: 'Password123!',
          role: 'volunteer',
        });

      expect(resVolunteer.status).toBe(400);
    });

    it('rejects duplicate email registrations', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'First User',
        email: 'same@example.com',
        password: 'Password123!',
        role: 'citizen',
      });

      const resDuplicate = await request(app).post('/api/auth/register').send({
        name: 'Duplicate User',
        email: 'SAME@example.com',
        password: 'Password456!',
        role: 'citizen',
      });

      expect(resDuplicate.status).toBe(400);
      expect(resDuplicate.body.message).toMatch(/already registered/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create citizen
      await request(app).post('/api/auth/register').send({
        name: 'Aarav Sharma',
        email: 'aarav@citizen.in',
        password: 'Password123!',
        role: 'citizen',
      });

      // Create lawyer
      await request(app).post('/api/auth/register').send({
        name: 'Advocate Rajesh',
        email: 'rajesh@lawyer.in',
        password: 'LawyerPassword123!',
        role: 'lawyer',
        barCouncilId: 'D/1234/2019',
      });
    });

    it('logs in successfully and sets httpOnly token cookie and audit log', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'aarav@citizen.in',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('aarav@citizen.in');
      expect(res.body.user.role).toBe('citizen');
      expect(res.body.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toMatch(/token=/);

      const audit = await AuditLog.findOne({ action: 'auth.login.success' });
      expect(audit).toBeDefined();
    });

    it('gives generic error on wrong password and writes audit log', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'aarav@citizen.in',
        password: 'WRONG_PASSWORD_XYZ',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');

      const audit = await AuditLog.findOne({ action: 'auth.login.failed' });
      expect(audit).toBeDefined();
    });

    it('gives generic error on non-existent email without revealing account existence', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'doesnotexist@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects login for inactive user', async () => {
      await User.updateOne({ email: 'aarav@citizen.in' }, { isActive: false });

      const res = await request(app).post('/api/auth/login').send({
        email: 'aarav@citizen.in',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/account is inactive/i);
    });
  });

  describe('GET /api/auth/me & POST /api/auth/logout', () => {
    it('/api/auth/me requires a cookie (401 when missing)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('/api/auth/me returns the logged in user from cookie', async () => {
      const loginRes = await request(app).post('/api/auth/register').send({
        name: 'Pooja Volunteer',
        email: 'pooja@test.in',
        password: 'Password123!',
        role: 'citizen',
      });

      const cookie = loginRes.headers['set-cookie'];

      const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.name).toBe('Pooja Volunteer');
      expect(meRes.body.user.email).toBe('pooja@test.in');
    });

    it('POST /api/auth/logout clears cookie and creates audit log', async () => {
      const loginRes = await request(app).post('/api/auth/register').send({
        name: 'Aarav Sharma',
        email: 'aarav@logout.in',
        password: 'Password123!',
        role: 'citizen',
      });

      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie);
      expect(logoutRes.status).toBe(200);

      const logoutCookie = logoutRes.headers['set-cookie'];
      expect(logoutCookie[0]).toMatch(/token=;/);

      const audit = await AuditLog.findOne({ action: 'auth.logout' });
      expect(audit).toBeDefined();
    });
  });

  describe('Guarded Demo Routes (GET /api/citizen/ping & GET /api/lawyer/ping)', () => {
    let citizenCookie: string[];
    let lawyerCookie: string[];

    beforeEach(async () => {
      const citizenReg = await request(app).post('/api/auth/register').send({
        name: 'Citizen One',
        email: 'citizen1@test.in',
        password: 'Password123!',
        role: 'citizen',
      });
      citizenCookie = citizenReg.headers['set-cookie'];

      const lawyerReg = await request(app).post('/api/auth/register').send({
        name: 'Lawyer One',
        email: 'lawyer1@test.in',
        password: 'Password123!',
        role: 'lawyer',
        barCouncilId: 'KRL/123/2012',
      });
      lawyerCookie = lawyerReg.headers['set-cookie'];
    });

    it('allows citizen on /api/citizen/ping and denies on /api/lawyer/ping (403)', async () => {
      const pingAllowed = await request(app)
        .get('/api/citizen/ping')
        .set('Cookie', citizenCookie);
      expect(pingAllowed.status).toBe(200);
      expect(pingAllowed.body.role).toBe('citizen');

      const pingDenied = await request(app)
        .get('/api/lawyer/ping')
        .set('Cookie', citizenCookie);
      expect(pingDenied.status).toBe(403);
    });

    it('allows lawyer on /api/lawyer/ping and denies on /api/citizen/ping (403)', async () => {
      const pingAllowed = await request(app)
        .get('/api/lawyer/ping')
        .set('Cookie', lawyerCookie);
      expect(pingAllowed.status).toBe(200);
      expect(pingAllowed.body.role).toBe('lawyer');

      const pingDenied = await request(app)
        .get('/api/citizen/ping')
        .set('Cookie', lawyerCookie);
      expect(pingDenied.status).toBe(403);
    });
  });
});
