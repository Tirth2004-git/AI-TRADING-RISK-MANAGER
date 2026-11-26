import { describe, expect, it } from 'vitest';
import { calculatePerformance } from '../../src/risk/performance.risk.js';

describe('performance.risk', () => {
  it('returns clean empty state without NaN or Infinity', () => {
    const perf = calculatePerformance([], 10000);

    expect(perf.currentBalance).toBe(10000);
    expect(perf.totalTrades).toBe(0);
    expect(perf.winRate).toBe(0);
    expect(perf.averageR).toBe(0);
    expect(perf.expectancy).toBe(0);
    expect(perf.profitFactor).toBeNull();
    expect(perf.currentDrawdownPct).toBe(0);
    expect(perf.maxDrawdownPct).toBe(0);
    expect(perf.currentLosingStreak).toBe(0);
    expect(perf.equityCurve).toHaveLength(1);
    expect(perf.equityCurve[0].equity).toBe(10000);
  });

  it('computes drawdown, win rate, profit factor, and losing streak after losses', () => {
    const closedTrades = [
      {
        _id: '1',
        symbol: 'BTCUSDT',
        realizedPnl: 1000,
        rMultiple: 2,
        closedAt: '2026-01-01T10:00:00Z',
      },
      {
        _id: '2',
        symbol: 'ETHUSDT',
        realizedPnl: -550,
        rMultiple: -1,
        closedAt: '2026-01-02T10:00:00Z',
      },
      {
        _id: '3',
        symbol: 'SOLUSDT',
        realizedPnl: -550,
        rMultiple: -1,
        closedAt: '2026-01-03T10:00:00Z',
      },
    ];

    const perf = calculatePerformance(closedTrades, 10000);

    expect(perf.peakBalance).toBe(11000);
    expect(perf.currentBalance).toBe(9900);
    expect(perf.currentDrawdownPct).toBeCloseTo(10, 4);
    expect(perf.maxDrawdownPct).toBeCloseTo(10, 4);
    expect(perf.winRate).toBeCloseTo(33.3333, 3);
    expect(perf.averageR).toBeCloseTo(0, 4);
    expect(perf.expectancy).toBeCloseTo(-100 / 3, 3);
    expect(perf.profitFactor).toBeCloseTo(1000 / 1100, 4);
    expect(perf.currentLosingStreak).toBe(2);
    expect(perf.equityCurve).toHaveLength(4);
  });

  it('keeps equity curve consistent with deposits, withdrawals, winning/losing trades, and fees without double counting', () => {
    const closedTrades = [
      {
        _id: 't1',
        symbol: 'BTCUSDT',
        realizedPnl: 500,
        rMultiple: 2.5,
        fees: 10,
        closedAt: '2026-11-20T12:00:00Z',
        exits: [{ pnl: 500, time: '2026-11-20T12:00:00Z' }],
      },
      {
        _id: 't2',
        symbol: 'ETHUSDT',
        realizedPnl: -200,
        rMultiple: -1,
        fees: 5,
        closedAt: '2026-11-22T12:00:00Z',
        exits: [{ pnl: -200, time: '2026-11-22T12:00:00Z' }],
      },
    ];
    const ledgerEntries = [
      { type: 'DEPOSIT', amount: 2000, date: '2026-11-21T10:00:00Z' },
      { type: 'WITHDRAWAL', amount: 1000, date: '2026-11-23T10:00:00Z' },
    ];

    const perf = calculatePerformance(closedTrades, 10000, ledgerEntries);

    // 10000 + 500 (t1) + 2000 (dep) - 200 (t2) - 1000 (wd) = 11300
    expect(perf.currentBalance).toBe(11300);
    expect(perf.totalFees).toBe(15);
    expect(perf.equityCurve).toHaveLength(5);
    expect(perf.equityCurve[perf.equityCurve.length - 1].equity).toBe(11300);
    // Performance index drawdown ignores the 1000 withdrawal:
    // t1: 100 * (1 + 500/10000) = 105; dep: balance 12500; t2: 105 * (1 - 200/12500) = 103.32
    // DD = (105 - 103.32) / 105 * 100 = 1.6%
    expect(perf.currentDrawdownPct).toBeCloseTo(1.6, 4);
  });
});
