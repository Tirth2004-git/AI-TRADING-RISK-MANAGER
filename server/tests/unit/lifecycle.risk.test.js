import { describe, expect, it } from 'vitest';
import {
  calculateExitPnl,
  calculateRemainingOpenRisk,
  evaluateMarkState,
  validateStopMove,
} from '../../src/risk/lifecycle.risk.js';
import { calculatePerformance } from '../../src/risk/performance.risk.js';

describe('lifecycle.risk', () => {
  it('computes partial exit PnL accurately', () => {
    const pnl1 = calculateExitPnl({
      side: 'LONG',
      entry: 100,
      initialQuantity: 20,
      entryFee: 0,
      exitQuantity: 10,
      exitPrice: 110,
      exitFee: 0,
      fundingPaid: 0,
    });
    const pnl2 = calculateExitPnl({
      side: 'LONG',
      entry: 100,
      initialQuantity: 20,
      entryFee: 0,
      exitQuantity: 10,
      exitPrice: 95,
      exitFee: 0,
      fundingPaid: 0,
    });

    expect(pnl1 + pnl2).toBeCloseTo(50, 4);
    expect((pnl1 + pnl2) / 100).toBeCloseTo(0.5, 4);
  });

  it('validates stop moves against mark price and requires reason when widening', () => {
    expect(() =>
      validateStopMove({
        side: 'LONG',
        oldStop: 95,
        newStop: 106,
        markPrice: 105,
        entry: 100,
        reason: 'Trail',
      })
    ).toThrow(/below current mark/i);

    expect(() =>
      validateStopMove({
        side: 'LONG',
        oldStop: 95,
        newStop: 92,
        markPrice: 105,
        entry: 100,
        reason: '',
      })
    ).toThrow(/reason is required/i);

    const lockedProfit = validateStopMove({
      side: 'LONG',
      oldStop: 95,
      newStop: 102,
      markPrice: 105,
      entry: 100,
    });
    expect(lockedProfit.isWidening).toBe(false);
  });

  it('detects stale mark price older than 4 hours and falls back to entry', () => {
    const now = new Date('2026-11-26T12:00:00Z');
    const stale = evaluateMarkState(
      {
        side: 'LONG',
        entry: 100,
        remainingQuantity: 10,
        markPrice: 105,
        markUpdatedAt: new Date('2026-11-26T07:00:00Z'),
        metrics: { liquidation: 90 },
      },
      now
    );
    expect(stale.isMarkStale).toBe(true);
    expect(stale.markLabel).toBe('manual');
    expect(stale.unrealizedPnl).toBe(50);

    const noMark = evaluateMarkState(
      {
        side: 'LONG',
        entry: 100,
        remainingQuantity: 10,
        metrics: { liquidation: 90 },
      },
      now
    );
    expect(noMark.markLabel).toBe('entry');
    expect(noMark.effectiveMark).toBe(100);
  });

  it('clamps open risk at 0 when stop is moved into profit', () => {
    const openRisk = calculateRemainingOpenRisk(
      {
        side: 'LONG',
        entry: 100,
        stopLoss: 105,
        leverage: 10,
        initialQuantity: 20,
        remainingQuantity: 20,
        metrics: { entryFee: 0, stopBeyondLiquidation: false },
      },
      { takerFeePct: 0, slippagePct: 0 }
    );
    expect(openRisk).toBe(0);
  });

  it('ignores withdrawals and deposits when computing drawdown', () => {
    const perf = calculatePerformance(
      [],
      10000,
      [{ type: 'WITHDRAWAL', amount: 1000, date: '2026-11-25T10:00:00Z' }]
    );
    expect(perf.currentBalance).toBe(9000);
    expect(perf.currentDrawdownPct).toBe(0);
    expect(perf.maxDrawdownPct).toBe(0);
  });
});
