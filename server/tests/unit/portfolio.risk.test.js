import { describe, expect, it } from 'vitest';
import { calculatePortfolioSummary } from '../../src/risk/portfolio.risk.js';

describe('portfolio.risk', () => {
  it('handles empty portfolio cleanly without NaN or Infinity', () => {
    const summary = calculatePortfolioSummary([], [], 10000);

    expect(summary.balance).toBe(10000);
    expect(summary.openCount).toBe(0);
    expect(summary.totalNotional).toBe(0);
    expect(summary.marginUsed).toBe(0);
    expect(summary.availableMargin).toBe(10000);
    expect(summary.openRiskAmount).toBe(0);
    expect(summary.openRiskPct).toBe(0);
    expect(summary.effectiveLeverage).toBe(0);
    expect(summary.concentration).toEqual([]);
  });

  it('aggregates open long and short exposure and concentration', () => {
    const openTrades = [
      {
        symbol: 'BTCUSDT',
        side: 'LONG',
        metrics: { notional: 6000, margin: 600, amountAtRisk: 100 },
      },
      {
        symbol: 'ETHUSDT',
        side: 'SHORT',
        metrics: { notional: 4000, margin: 400, amountAtRisk: 150 },
      },
    ];
    const closedTrades = [{ realizedPnl: 500 }];

    const summary = calculatePortfolioSummary(openTrades, closedTrades, 10000);

    expect(summary.balance).toBe(10500);
    expect(summary.totalNotional).toBe(10000);
    expect(summary.marginUsed).toBe(1000);
    expect(summary.availableMargin).toBe(9500);
    expect(summary.openRiskAmount).toBe(250);
    expect(summary.openRiskPct).toBeCloseTo((250 / 10500) * 100, 4);
    expect(summary.longExposure).toBe(6000);
    expect(summary.shortExposure).toBe(4000);
    expect(summary.netExposure).toBe(2000);
    expect(summary.effectiveLeverage).toBeCloseTo(10000 / 10500, 4);
    expect(summary.concentration).toEqual([
      { symbol: 'BTCUSDT', notional: 6000, pct: 60 },
      { symbol: 'ETHUSDT', notional: 4000, pct: 40 },
    ]);
  });
});
