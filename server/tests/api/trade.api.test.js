import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import AuditLog from '../../src/models/AuditLog.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Trades API', () => {
  it('analyzes a good long without saving', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    await agent.put('/api/settings').send({
      startingBalance: 10000,
      riskPerTradePct: 1,
      maxLeverage: 10,
      minRiskReward: 1.5,
      maxOpenRiskPct: 5,
      maxDrawdownPct: 10,
      maxDailyLossPct: 3,
      maxGroupRiskPct: 10,
      maintenanceMarginPct: 0.5,
      takerFeePct: 0,
      slippagePct: 0,
      defaultFundingRatePct: 0,
    });

    const res = await agent.post('/api/trades/analyze').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.quantity).toBeCloseTo(20, 4);
    expect(res.body.data.metrics.margin).toBeCloseTo(200, 4);
    expect(res.body.data.metrics.liquidation).toBeCloseTo(90.5, 4);
    expect(res.body.data.riskScore).toBe(10);
    expect(res.body.data.riskBand).toBe('Low');

    const listRes = await agent.get('/api/trades');
    expect(listRes.body.data).toHaveLength(0);
  });

  it('requires acknowledged: true to save High or Critical trades', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    await agent.put('/api/settings').send({
      startingBalance: 10000,
      riskPerTradePct: 1,
      maxLeverage: 10,
      minRiskReward: 1.5,
      maxOpenRiskPct: 5,
      maxDrawdownPct: 10,
      maxDailyLossPct: 3,
      maxGroupRiskPct: 10,
      maintenanceMarginPct: 0.5,
      takerFeePct: 0,
      slippagePct: 0,
      defaultFundingRatePct: 0,
    });

    const unackRes = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 100,
      leverage: 20,
    });

    expect(unackRes.status).toBe(400);
    expect(unackRes.body.error.message).toMatch(/understand the risk/i);

    const ackRes = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 100,
      leverage: 20,
      acknowledged: true,
    });

    expect(ackRes.status).toBe(201);
    expect(ackRes.body.data.riskScore).toBe(75);
    expect(ackRes.body.data.riskBand).toBe('High');
  });

  it('creates, edits, closes, and lists a trade', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    await agent.put('/api/settings').send({
      startingBalance: 10000,
      riskPerTradePct: 1,
      maxLeverage: 10,
      minRiskReward: 1.5,
      maxOpenRiskPct: 5,
      maxDrawdownPct: 10,
      maxDailyLossPct: 3,
      maxGroupRiskPct: 10,
      maintenanceMarginPct: 0.5,
      takerFeePct: 0,
      slippagePct: 0,
      defaultFundingRatePct: 0,
    });

    const createRes = await agent.post('/api/trades').send({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    expect(createRes.status).toBe(201);
    const tradeId = createRes.body.data._id;

    const editRes = await agent.put(`/api/trades/${tradeId}`).send({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 115,
      leverage: 5,
    });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.riskScore).toBe(0);
    expect(editRes.body.data.metrics.riskReward).toBeCloseTo(3, 4);

    const closeRes = await agent
      .post(`/api/trades/${tradeId}/close`)
      .send({ exitPrice: 110, fees: 0 });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('CLOSED');
    expect(closeRes.body.data.realizedPnl).toBeCloseTo(200, 4);
    expect(closeRes.body.data.rMultiple).toBeCloseTo(2, 4);

    const editClosedRes = await agent.put(`/api/trades/${tradeId}`).send({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    expect(editClosedRes.status).toBe(400);
  });

  it('cancels and deletes an open trade', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const createRes = await agent.post('/api/trades').send({
      symbol: 'SOLUSDT',
      side: 'SHORT',
      entry: 100,
      stopLoss: 105,
      target: 90,
      leverage: 10,
    });
    const id = createRes.body.data._id;

    const cancelRes = await agent.post(`/api/trades/${id}/cancel`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const delRes = await agent.delete(`/api/trades/${id}`);
    expect(delRes.status).toBe(200);

    const getRes = await agent.get(`/api/trades/${id}`);
    expect(getRes.status).toBe(404);
  });

  it('blocks editing trades with partial exits, enforces BLOCK override on edit, validates ObjectIds, and sets Helmet headers', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const healthRes = await agent.get('/api/health');
    expect(healthRes.headers['x-content-type-options']).toBe('nosniff');

    const badIdRes = await agent.get('/api/trades/not-a-valid-id');
    expect(badIdRes.status).toBe(400);
    expect(badIdRes.body.error.message).toMatch(/invalid id/i);

    const createRes = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });
    const tradeId = createRes.body.data._id;

    const blockedEdit = await agent.put(`/api/trades/${tradeId}`).send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 500,
      leverage: 50,
      acknowledged: true,
      overrideReason: 'short',
    });
    expect(blockedEdit.status).toBe(400);
    expect(blockedEdit.body.error.message).toMatch(/20 characters/i);

    const overrideReason =
      'Valid override reason with more than twenty characters for audit';
    const overrideEdit = await agent.put(`/api/trades/${tradeId}`).send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 500,
      leverage: 50,
      acknowledged: true,
      overrideReason,
    });
    expect(overrideEdit.status).toBe(200);

    const auditEntry = await AuditLog.findOne({
      action: 'OVERRIDE_EDIT',
      entityId: String(tradeId),
    }).lean();
    expect(auditEntry).not.toBeNull();
    expect(auditEntry.entity).toBe('Trade');
    expect(auditEntry.reason).toBe(overrideReason);

    const exitRes = await agent
      .post(`/api/trades/${tradeId}/exits`)
      .send({ quantity: 100, price: 102, fee: 0, fundingPaid: 0 });
    expect(exitRes.status).toBe(200);

    const editAfterExit = await agent.put(`/api/trades/${tradeId}`).send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });
    expect(editAfterExit.status).toBe(400);
    expect(editAfterExit.body.error.message).toMatch(/partial exits/i);
  });

  it('supports paginated GET /api/trades and rejects extreme values', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const extremeRes = await agent.post('/api/trades/analyze').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 1e15,
      stopLoss: 95,
      leverage: 10,
    });
    expect(extremeRes.status).toBe(400);

    for (let i = 0; i < 3; i += 1) {
      await agent.post('/api/trades').send({
        symbol: 'BTCUSDT',
        side: 'LONG',
        entry: 100,
        stopLoss: 95,
        target: 110,
        leverage: 5,
      });
    }

    const page1 = await agent.get('/api/trades?page=1&limit=2');
    expect(page1.status).toBe(200);
    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.pagination.totalRecords).toBe(3);
    expect(page1.body.data.pagination.totalPages).toBe(2);
    expect(page1.body.data.pagination.hasNextPage).toBe(true);
    expect(page1.body.data.pagination.nextPage).toBe(2);

    const page2 = await agent.get('/api/trades?page=2&limit=2');
    expect(page2.status).toBe(200);
    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.pagination.hasPrevPage).toBe(true);
    expect(page2.body.data.pagination.prevPage).toBe(1);
  });
});
