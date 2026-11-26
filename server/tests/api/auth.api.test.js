import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import '../setup.js';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import { hashToken } from '../../src/middleware/auth.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Authentication, Authorization & User Isolation API', () => {
  it('registers, hashes password, omits passwordHash, and rejects invalid/duplicate registration', async () => {
    const badName = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'a@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      acceptTerms: true,
    });
    expect(badName.status).toBe(400);

    const weakPw = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'a@example.com',
      password: 'weak',
      confirmPassword: 'weak',
      acceptTerms: true,
    });
    expect(weakPw.status).toBe(400);

    const okRes = await request(app).post('/api/auth/register').send({
      name: 'Alice Trader',
      email: 'Alice@Example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      acceptTerms: true,
    });
    expect(okRes.status).toBe(201);
    expect(okRes.body.data.user.email).toBe('alice@example.com');
    expect(okRes.body.data.user.passwordHash).toBeUndefined();

    const dbUser = await User.findOne({ email: 'alice@example.com' })
      .select('+passwordHash')
      .lean();
    expect(dbUser.passwordHash).toBeDefined();
    expect(dbUser.passwordHash).not.toBe('Password123');

    const dupRes = await request(app).post('/api/auth/register').send({
      name: 'Alice Two',
      email: 'alice@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
      acceptTerms: true,
    });
    expect(dupRes.status).toBe(409);
  });

  it('logs in, rejects wrong password/unknown/inactive account, and logs out', async () => {
    await createAuthenticatedAgent(app, {
      email: 'bob@example.com',
      password: 'Password123',
    });

    const wrongPw = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'WrongPassword1',
    });
    expect(wrongPw.status).toBe(401);

    const unknown = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'Password123',
    });
    expect(unknown.status).toBe(401);

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'Password123',
    });
    expect(loginRes.status).toBe(200);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('bob@example.com');

    await agent.post('/api/auth/logout');
    const afterLogout = await agent.get('/api/auth/me');
    expect(afterLogout.status).toBe(401);

    await User.updateOne({ email: 'bob@example.com' }, { $set: { isActive: false } });
    const inactiveLogin = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'Password123',
    });
    expect(inactiveLogin.status).toBe(403);
  });

  it('enforces strict cross-user data isolation across trades, settings, export, and AI', async () => {
    const unauth = await request(app).get('/api/trades');
    expect(unauth.status).toBe(401);

    const { agent: userA } = await createAuthenticatedAgent(app, {
      email: 'usera@example.com',
    });
    const { agent: userB } = await createAuthenticatedAgent(app, {
      email: 'userb@example.com',
    });

    const createdA = await userA.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 5,
    });
    const tradeAId = createdA.body.data._id;

    // User B cannot view, edit, delete, or AI-review User A's trade
    expect((await userB.get(`/api/trades/${tradeAId}`)).status).toBe(404);
    expect(
      (
        await userB.put(`/api/trades/${tradeAId}`).send({
          symbol: 'BTCUSDT',
          side: 'LONG',
          entry: 100,
          stopLoss: 95,
          leverage: 5,
        })
      ).status
    ).toBe(404);
    expect((await userB.delete(`/api/trades/${tradeAId}`)).status).toBe(404);
    expect(
      (await userB.post('/api/ai/trade-review').send({ tradeId: tradeAId })).status
    ).toBe(404);

    // User B's export and trade list contain 0 of User A's records
    const exportB = await userB.get('/api/export');
    expect(exportB.body.data.trades).toHaveLength(0);

    // User A's settings update does not affect User B
    await userA.put('/api/settings').send({
      startingBalance: 50000,
      riskPerTradePct: 2,
      maxLeverage: 10,
      minRiskReward: 1.5,
      maxOpenRiskPct: 5,
      maxDrawdownPct: 10,
      maxDailyLossPct: 3,
      maintenanceMarginPct: 0.5,
    });
    const settingsB = await userB.get('/api/settings');
    expect(settingsB.body.data.startingBalance).toBe(10000);
  });

  it('handles email verification and password reset with single-use hashed tokens and session invalidation', async () => {
    const { agent } = await createAuthenticatedAgent(app, {
      email: 'reset@example.com',
      password: 'Password123',
    });

    // Verify email token
    const rawVerify = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { email: 'reset@example.com' },
      {
        $set: {
          emailVerificationTokenHash: hashToken(rawVerify),
          emailVerificationExpires: new Date(Date.now() + 60000),
        },
      }
    );

    const verifyRes = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: rawVerify });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.user.emailVerified).toBe(true);

    // Reuse fails
    const verifyReuse = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: rawVerify });
    expect(verifyReuse.status).toBe(400);

    // Forgot password returns generic response even for unknown email
    const forgotUnknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing@example.com' });
    expect(forgotUnknown.status).toBe(200);

    // Set a reset token and test reset + session invalidation
    const rawReset = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { email: 'reset@example.com' },
      {
        $set: {
          passwordResetTokenHash: hashToken(rawReset),
          passwordResetExpires: new Date(Date.now() + 60000),
        },
      }
    );

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: rawReset,
      password: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    });
    expect(resetRes.status).toBe(200);

    // Old session is invalidated
    const oldSessionCheck = await agent.get('/api/auth/me');
    expect(oldSessionCheck.status).toBe(401);

    // Token cannot be reused
    const reuseReset = await request(app).post('/api/auth/reset-password').send({
      token: rawReset,
      password: 'AnotherPassword123',
      confirmPassword: 'AnotherPassword123',
    });
    expect(reuseReset.status).toBe(400);

    // New password works
    const newLogin = await request(app).post('/api/auth/login').send({
      email: 'reset@example.com',
      password: 'NewPassword123',
    });
    expect(newLogin.status).toBe(200);
  });
});
