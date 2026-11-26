import { describe, expect, it } from 'vitest';
import request from 'supertest';
import '../setup.js';
import app from '../../src/app.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Demo Mode API', () => {
  it('generates 40 demo trades idempotently, isolates demo from user data, and enforces read-only demo session', async () => {
    const { agent: userAgent } = await createAuthenticatedAgent(app);
    const userTradeRes = await userAgent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 50000,
      stopLoss: 49000,
      target: 53000,
      leverage: 5,
      notes: 'Real user trade',
    });
    expect(userTradeRes.status).toBe(201);

    const gen1 = await userAgent.post('/api/demo/generate');
    expect(gen1.status).toBe(201);
    expect(gen1.body.data.alreadySeeded).toBe(false);
    expect(gen1.body.data.created.trades).toBe(40);
    expect(gen1.body.data.created.ledgerEntries).toBe(4);

    const gen2 = await userAgent.post('/api/demo/generate');
    expect(gen2.status).toBe(200);
    expect(gen2.body.data.alreadySeeded).toBe(true);

    // Demo session sees ONLY demo data (not the user's trade!) and cannot mutate
    const demoAgent = request.agent(app);
    const demoLogin = await demoAgent.post('/api/auth/demo');
    expect(demoLogin.status).toBe(200);
    expect(demoLogin.body.data.user.isDemo).toBe(true);

    const [summaryRes, perfRes, mcRes, analyticsRes, aiRes, demoWriteRes] =
      await Promise.all([
        demoAgent.get('/api/portfolio/summary'),
        demoAgent.get('/api/portfolio/performance'),
        demoAgent
          .post('/api/risk/montecarlo')
          .send({ runs: 500, tradesPerRun: 50, seed: 42 }),
        demoAgent.get('/api/analytics'),
        demoAgent.post('/api/ai/portfolio-review'),
        demoAgent.post('/api/trades').send({
          symbol: 'BTCUSDT',
          side: 'LONG',
          entry: 50000,
          stopLoss: 49000,
          leverage: 5,
        }),
      ]);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.openCount).toBe(5); // Only the 5 demo open trades!
    expect(perfRes.body.data.totalTrades).toBe(30);
    expect(mcRes.body.data.eligible).toBe(true);
    expect(analyticsRes.body.data.bySymbol.length).toBeGreaterThanOrEqual(4);
    expect(aiRes.body.data.source).toBe('fallback');
    expect(demoWriteRes.status).toBe(403);

    // Reset requires confirmation and preserves real user trade
    const resetNoConfirm = await userAgent.delete('/api/demo/reset').send({});
    expect(resetNoConfirm.status).toBe(400);

    const resetRes = await userAgent
      .delete('/api/demo/reset')
      .send({ confirm: true });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data.deleted.trades).toBe(40);
    expect(resetRes.body.data.status.active).toBe(false);
    expect(resetRes.body.data.status.userCounts.trades).toBe(1);
  });
});
