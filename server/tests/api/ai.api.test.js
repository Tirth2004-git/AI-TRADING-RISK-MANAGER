import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../setup.js';
import env from '../../src/config/env.js';
import app from '../../src/app.js';
import * as geminiClient from '../../src/ai/gemini.client.js';
import { createAuthenticatedAgent } from '../helpers/authTestHelper.js';

describe('AI Risk Coach API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    env.geminiApiKey = '';
  });

  it('returns rule-based fallback when GEMINI_API_KEY is missing', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post('/api/ai/trade-review').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      leverage: 10,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('fallback');
    expect(res.body.data.response.verdict).toBe('ACCEPTABLE');
    expect(typeof res.body.data.response.summary).toBe('string');
  });

  it('enforces verdict floor on Critical trade even if Gemini returns ACCEPTABLE', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    env.geminiApiKey = 'test-key';
    const spy = vi.spyOn(geminiClient, 'generateGeminiJson').mockResolvedValue(
      JSON.stringify({
        summary: 'Looks fine.',
        weaknesses: ['High leverage'],
        suggestions: ['Lower leverage'],
        verdict: 'ACCEPTABLE',
      })
    );

    const res = await agent.post('/api/ai/trade-review').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 500,
      leverage: 50,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('gemini');
    expect(res.body.data.response.verdict).toBe('TOO_RISKY');
    expect(spy).toHaveBeenCalledTimes(1);

    const cachedRes = await agent.post('/api/ai/trade-review').send({
      symbol: 'BTCUSDT',
      side: 'LONG',
      entry: 100,
      quantity: 500,
      leverage: 50,
    });

    expect(cachedRes.status).toBe(200);
    expect(cachedRes.body.data.source).toBe('gemini');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('falls back gracefully when Gemini returns invalid JSON', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    env.geminiApiKey = 'test-key';
    vi.spyOn(geminiClient, 'generateGeminiJson').mockResolvedValue('not-json');

    const res = await agent.post('/api/ai/trade-review').send({
      symbol: 'ETHUSDT',
      side: 'LONG',
      entry: 100,
      stopLoss: 85,
      leverage: 10,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('fallback');
    expect(res.body.data.response.verdict).toBe('NEEDS_CHANGES');
  });

  it('reviews portfolio with fallback when no key is set', async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post('/api/ai/portfolio-review');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('PORTFOLIO');
    expect(res.body.data.source).toBe('fallback');
  });
});
