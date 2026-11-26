import { describe, expect, it } from 'vitest';
import '../setup.js';
import app from '../../src/app.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('Analytics, Journal, Export & Weekly AI API', () => {
  it('updates trade journal, returns analytics, weekly AI fallback, and full JSON export', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const created = await agent.post('/api/trades').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });
    const id = created.body.data._id;

    const journalRes = await agent.patch(`/api/trades/${id}/journal`).send({
      setupTag: 'PULLBACK',
      emotionTag: 'CALM',
      followedPlan: true,
      lesson: 'Waited for confirmation',
    });
    expect(journalRes.status).toBe(200);
    expect(journalRes.body.data.setupTag).toBe('PULLBACK');

    const analyticsRes = await agent.get('/api/analytics');
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.flagCounts).toBeDefined();

    const weeklyAiRes = await agent.post('/api/ai/weekly-review');
    expect(weeklyAiRes.status).toBe(200);
    expect(weeklyAiRes.body.data.type).toBe('WEEKLY');
    expect(weeklyAiRes.body.data.source).toBe('fallback');

    const exportRes = await agent.get('/api/export');
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.trades).toHaveLength(1);
  });
});
