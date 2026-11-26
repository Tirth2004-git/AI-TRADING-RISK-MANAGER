import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/risk/constants.js';
import { evaluateGuardrails } from '../../src/risk/guardrails.risk.js';

describe('guardrails.risk', () => {
  const now = new Date('2026-11-26T10:00:00+05:30');

  it('blocks on daily loss, weekly loss, max trades/day, cooldown, open risk, group risk, and Critical band', () => {
    // 1. Daily loss >= 3%
    const dailyBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      closedTrades: [{ realizedPnl: -300, closedAt: '2026-11-26T08:00:00+05:30', openedAt: '2026-11-26T07:00:00+05:30' }],
      balance: 9700,
      now,
    });
    expect(dailyBlock.status).toBe('BLOCK');
    expect(dailyBlock.blockReasons.some((r) => /daily loss/i.test(r))).toBe(true);

    // 2. Weekly loss >= 7%
    const weeklyBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      closedTrades: [{ realizedPnl: -700, closedAt: '2026-11-24T10:00:00+05:30', openedAt: '2026-11-24T09:00:00+05:30' }],
      balance: 9300,
      now,
    });
    expect(weeklyBlock.status).toBe('BLOCK');
    expect(weeklyBlock.blockReasons.some((r) => /weekly loss/i.test(r))).toBe(true);

    // 3. Max trades per day
    const countBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      allTradesOpenedTodayCount: 5,
      balance: 10000,
      now,
    });
    expect(countBlock.status).toBe('BLOCK');
    expect(countBlock.blockReasons.some((r) => /daily trade count/i.test(r))).toBe(true);

    // 4. Cooldown after 3 losses
    const cooldownBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      closedTrades: [
        { realizedPnl: -50, closedAt: '2026-11-25T10:00:00+05:30' },
        { realizedPnl: -50, closedAt: '2026-11-25T12:00:00+05:30' },
        { realizedPnl: -50, closedAt: '2026-11-26T09:30:00+05:30' },
      ],
      balance: 9850,
      now,
    });
    expect(cooldownBlock.status).toBe('BLOCK');
    expect(cooldownBlock.blockReasons.some((r) => /cooldown/i.test(r))).toBe(true);

    // 5. Open risk > 5%
    const openRiskBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      balance: 10000,
      openRiskAmount: 450,
      candidate: { symbol: 'BTCUSDT', side: 'LONG', amountAtRisk: 100, riskBand: 'Low' },
      now,
    });
    expect(openRiskBlock.status).toBe('BLOCK');
    expect(openRiskBlock.blockReasons.some((r) => /open risk/i.test(r))).toBe(true);

    // 6. Group risk > 3% same direction
    const groupBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      openTrades: [{ symbol: 'BTCUSDT', side: 'LONG', metrics: { amountAtRisk: 200 } }],
      symbolProfilesMap: new Map([
        ['BTCUSDT', { correlationGroup: 'MAJORS' }],
        ['ETHUSDT', { correlationGroup: 'MAJORS' }],
      ]),
      balance: 10000,
      openRiskAmount: 200,
      candidate: { symbol: 'ETHUSDT', side: 'LONG', amountAtRisk: 150, riskBand: 'Low' },
      now,
    });
    expect(groupBlock.status).toBe('BLOCK');
    expect(groupBlock.blockReasons.some((r) => /correlation group/i.test(r))).toBe(true);

    // 7. Critical band
    const criticalBlock = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      balance: 10000,
      candidate: { symbol: 'SOLUSDT', side: 'LONG', amountAtRisk: 50, riskBand: 'Critical' },
      now,
    });
    expect(criticalBlock.status).toBe('BLOCK');
    expect(criticalBlock.blockReasons.some((r) => /critical/i.test(r))).toBe(true);
  });

  it('returns WARN when a limit is 80%+ used', () => {
    const warn = evaluateGuardrails({
      settings: DEFAULT_SETTINGS,
      closedTrades: [{ realizedPnl: -250, closedAt: '2026-11-26T08:00:00+05:30', openedAt: '2026-11-26T07:00:00+05:30' }],
      balance: 9750,
      now,
    });
    expect(warn.status).toBe('WARN');
  });
});
