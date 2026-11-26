import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Symbol Profiles API', () => {
  it('creates, lists, updates, and deletes symbol profiles', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const createRes = await agent.post('/api/symbols').send({
      symbol: 'BTCUSDT',
      maintenanceMarginPct: 0.4,
      maxLeverage: 20,
      qtyStep: 0.001,
      minNotional: 10,
      correlationGroup: 'MAJORS',
      beta: 1,
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.symbol).toBe('BTCUSDT');
    expect(createRes.body.data.correlationGroup).toBe('MAJORS');

    const listRes = await agent.get('/api/symbols');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const id = createRes.body.data._id;
    const updateRes = await agent.put(`/api/symbols/${id}`).send({
      symbol: 'BTCUSDT',
      maintenanceMarginPct: 0.5,
      maxLeverage: 15,
      qtyStep: 0.01,
      minNotional: 20,
      beta: 1.1,
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.maxLeverage).toBe(15);
    expect(updateRes.body.data.correlationGroup).toBe('BTCUSDT');

    const delRes = await agent.delete(`/api/symbols/${id}`);
    expect(delRes.status).toBe(200);
  });

  it('returns 409 on duplicate symbol and 400 on invalid ObjectId, and maps 11000 errors to 409', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    await agent.post('/api/symbols').send({
      symbol: 'ETHUSDT',
      maintenanceMarginPct: 0.5,
      maxLeverage: 20,
    });

    const dupRes = await agent.post('/api/symbols').send({
      symbol: 'ETHUSDT',
      maintenanceMarginPct: 0.5,
      maxLeverage: 20,
    });
    expect(dupRes.status).toBe(409);

    const badIdRes = await agent.put('/api/symbols/invalid-id').send({
      symbol: 'ETHUSDT',
      maintenanceMarginPct: 0.5,
      maxLeverage: 20,
    });
    expect(badIdRes.status).toBe(400);

    const { default: errorHandler } = await import('../../src/middleware/errorHandler.js');
    let capturedStatus = null;
    let capturedBody = null;
    const mockRes = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      },
    };
    errorHandler({ code: 11000, keyValue: { symbol: 'ETHUSDT' } }, {}, mockRes, () => {});
    expect(capturedStatus).toBe(409);
    expect(capturedBody.error.message).toMatch(/duplicate value/i);
  });
});
