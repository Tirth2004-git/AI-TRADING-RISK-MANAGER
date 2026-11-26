import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Settings API', () => {
  it('GET /api/settings creates and returns default settings for authenticated user', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get('/api/settings');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.startingBalance).toBe(10000);
    expect(res.body.data.riskPerTradePct).toBe(1);
    expect(res.body.data.maxLeverage).toBe(10);
    expect(res.body.data.minRiskReward).toBe(1.5);
    expect(res.body.data.maintenanceMarginPct).toBe(0.5);
  });

  it('PUT /api/settings updates settings and validates input', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const updateRes = await agent.put('/api/settings').send({
      startingBalance: 25000,
      riskPerTradePct: 2,
      maxLeverage: 15,
      minRiskReward: 2,
      maxOpenRiskPct: 6,
      maxDrawdownPct: 12,
      maxDailyLossPct: 4,
      maintenanceMarginPct: 0.5,
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.startingBalance).toBe(25000);
    expect(updateRes.body.data.riskPerTradePct).toBe(2);

    const invalidRes = await agent.put('/api/settings').send({
      startingBalance: -100,
      riskPerTradePct: 1,
      maxLeverage: 10,
      minRiskReward: 1.5,
      maxOpenRiskPct: 5,
      maxDrawdownPct: 10,
      maxDailyLossPct: 3,
      maintenanceMarginPct: 0.5,
    });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
  });
});
