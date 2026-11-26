import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Guardrails API', () => {
  it('returns ALLOW on clean account and enforces 20-char overrideReason on BLOCKED trade', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const statusRes = await agent.get('/api/guardrails/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('ALLOW');

    const blockedNoOverride = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 500,
      leverage: 50,
      acknowledged: true,
      overrideReason: 'too short',
    });
    expect(blockedNoOverride.status).toBe(400);
    expect(blockedNoOverride.body.error.message).toMatch(/20 characters/i);

    const blockedWithOverride = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 500,
      leverage: 50,
      acknowledged: true,
      overrideReason:
        'High conviction setup tested in simulation with strict manual monitoring',
    });
    expect(blockedWithOverride.status).toBe(201);
  });

  it('excludes CANCELLED trades from maxTradesPerDay', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const createRes = await agent.post('/api/trades').send({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 5,
    });
    expect(createRes.status).toBe(201);

    const cancelRes = await agent.post(
      `/api/trades/${createRes.body.data._id}/cancel`
    );
    expect(cancelRes.status).toBe(200);

    const statusRes = await agent.get('/api/guardrails/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.limits.tradesToday).toBe(0);
  });
});
