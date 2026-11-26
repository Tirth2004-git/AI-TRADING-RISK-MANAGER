import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import '../setup.js';
import app from '../../src/app.js';
import { createHeavyRouteLimiter } from '../../src/middleware/rateLimit.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Stress & Monte Carlo API', () => {
  it('runs stress test and returns ineligible Monte Carlo below 30 trades', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    const stressRes = await agent
      .post('/api/risk/stress')
      .send({ mode: 'STOPS_WORK', customShockPct: -30 });

    expect(stressRes.status).toBe(200);
    expect(stressRes.body.data.scenarios).toHaveLength(7);

    const mcRes = await agent.post('/api/risk/montecarlo').send({ seed: 1 });
    expect(mcRes.status).toBe(200);
    expect(mcRes.body.data.eligible).toBe(false);
    expect(mcRes.body.data.tradesNeeded).toBe(30);
  });

  it('enforces heavyRouteLimiter after 30 requests per minute with HTTP 429', async () => {
    const testApp = express();
    testApp.get('/limited', createHeavyRouteLimiter(), (_req, res) => {
      res.status(200).json({ success: true });
    });

    for (let i = 0; i < 30; i += 1) {
      const okRes = await request(testApp).get('/limited');
      expect(okRes.status).toBe(200);
    }

    const blockedRes = await request(testApp).get('/limited');
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.error.message).toMatch(/too many requests/i);
  });

  it('returns advanced risk metrics (RoR, Kelly, Recovery, Risk Budget) and correlation', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const advRes = await agent.get('/api/risk/advanced');
    expect(advRes.status).toBe(200);
    expect(advRes.body.data.riskOfRuin.eligible).toBe(false);
    expect(advRes.body.data.kelly.eligible).toBe(false);
    expect(advRes.body.data.riskBudget.dailyLossLimitPct).toBe(3);

    const corrRes = await agent
      .post('/api/risk/correlation')
      .send({
        series: {
          BTCUSDT: [100, 105, 110, 115],
          ETHUSDT: [10, 10.5, 11, 11.5],
        },
      });
    expect(corrRes.status).toBe(200);
    expect(corrRes.body.data.eligible).toBe(true);
    expect(corrRes.body.data.matrix.BTCUSDT.ETHUSDT).toBeCloseTo(1, 4);
  });
});
