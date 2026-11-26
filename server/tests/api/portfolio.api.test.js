import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Portfolio API', () => {
  it('returns empty summary and performance cleanly', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const [summaryRes, perfRes] = await Promise.all([
      agent.get('/api/portfolio/summary'),
      agent.get('/api/portfolio/performance'),
    ]);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.balance).toBe(10000);
    expect(summaryRes.body.data.openCount).toBe(0);
    expect(summaryRes.body.data.effectiveLeverage).toBe(0);

    expect(perfRes.status).toBe(200);
    expect(perfRes.body.data.totalTrades).toBe(0);
    expect(perfRes.body.data.profitFactor).toBeNull();
  });

  it('reflects open and closed trades in summary and performance', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    await agent.put('/api/settings').send({
      startingBalance: 10000,
      riskPerTradePct: 1,
      maxLeverage: 10,
      minRiskReward: 1.5,
      maxOpenRiskPct: 5,
      maxDrawdownPct: 10,
      maxDailyLossPct: 3,
      maintenanceMarginPct: 0.5,
      takerFeePct: 0,
      slippagePct: 0,
      defaultFundingRatePct: 0,
    });

    const openTradeRes = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    const closedTradeRes = await agent.post('/api/trades').send({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    await agent
      .post(`/api/trades/${closedTradeRes.body.data._id}/close`)
      .send({ exitPrice: 110, fees: 0 });

    const [summaryRes, perfRes] = await Promise.all([
      agent.get('/api/portfolio/summary'),
      agent.get('/api/portfolio/performance'),
    ]);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.balance).toBeCloseTo(10200, 4);
    expect(summaryRes.body.data.openCount).toBe(1);
    expect(summaryRes.body.data.totalNotional).toBeCloseTo(2000, 4);

    expect(perfRes.status).toBe(200);
    expect(perfRes.body.data.totalTrades).toBe(1);
    expect(perfRes.body.data.winRate).toBe(100);
    expect(perfRes.body.data.currentBalance).toBeCloseTo(10200, 4);
    expect(openTradeRes.status).toBe(201);
  });
});
