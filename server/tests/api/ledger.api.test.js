import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import Trade from '../../src/models/Trade.js';
import { migrateDatabase } from '../../scripts/migrate.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Lifecycle, Ledger, Audit & Migration API', () => {
  it('supports partial exits, stop moves, mark price, and blocks deleting trades with exits', async () => {
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

    const createRes = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });
    const id = createRes.body.data._id;

    const markRes = await agent
      .patch(`/api/trades/${id}/mark`)
      .send({ markPrice: 108 });
    expect(markRes.status).toBe(200);
    expect(markRes.body.data.markState.unrealizedPnl).toBeCloseTo(160, 4);

    const stopRes = await agent
      .patch(`/api/trades/${id}/stop`)
      .send({ stopLoss: 101, reason: 'Lock profit' });
    expect(stopRes.status).toBe(200);
    expect(stopRes.body.data.stopHistory).toHaveLength(1);

    const exit1 = await agent
      .post(`/api/trades/${id}/exits`)
      .send({ quantity: 10, price: 110, fee: 0, fundingPaid: 0 });
    expect(exit1.status).toBe(200);
    expect(exit1.body.data.status).toBe('OPEN');
    expect(exit1.body.data.remainingQuantity).toBeCloseTo(10, 4);

    const delBlocked = await agent.delete(`/api/trades/${id}`);
    expect(delBlocked.status).toBe(400);

    const exit2 = await agent
      .post(`/api/trades/${id}/exits`)
      .send({ quantity: 10, price: 95, fee: 0, fundingPaid: 0 });
    expect(exit2.status).toBe(200);
    expect(exit2.body.data.status).toBe('CLOSED');
    expect(exit2.body.data.realizedPnl).toBeCloseTo(50, 4);
    expect(exit2.body.data.rMultiple).toBeCloseTo(0.5, 4);

    const auditRes = await agent.get('/api/audit');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it('records deposits and withdrawals and blocks withdrawal above available margin', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const withdrawRes = await agent.post('/api/ledger').send({
      type: 'WITHDRAWAL',
      amount: 1000,
      note: 'Profit payout',
    });
    expect(withdrawRes.status).toBe(201);

    const summaryRes = await agent.get('/api/portfolio/summary');
    expect(summaryRes.body.data.balance).toBe(9000);
    expect(summaryRes.body.data.currentDrawdownPct).toBe(0);

    const tooMuchRes = await agent.post('/api/ledger').send({
      type: 'WITHDRAWAL',
      amount: 10000,
    });
    expect(tooMuchRes.status).toBe(400);
  });

  it('runs migrateDatabase idempotently without changing old PnL', async () => {
    await Trade.create({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      leverage: 10,
      quantity: 20,
      status: 'CLOSED',
      exitPrice: 110,
      fees: 0,
      realizedPnl: 200,
      rMultiple: 2,
      metrics: { quantity: 20, amountAtRisk: 100 },
      riskScore: 10,
      riskBand: 'Low',
    });

    const first = await migrateDatabase();
    expect(first.migratedClosed).toBe(1);

    const second = await migrateDatabase();
    expect(second.migratedClosed).toBe(0);

    const migrated = await Trade.findOne({ symbol: 'ETHUSDT' }).lean();
    expect(migrated.realizedPnl).toBe(200);
    expect(migrated.exits).toHaveLength(1);
    expect(migrated.remainingQuantity).toBe(0);
  });
});
