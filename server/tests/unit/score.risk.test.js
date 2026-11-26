import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/risk/constants.js';
import { calculateTradeMetrics } from '../../src/risk/trade.risk.js';
import { calculateRiskScore } from '../../src/risk/score.risk.js';
import { generateTradeWarnings } from '../../src/risk/warnings.risk.js';

describe('score.risk & warnings.risk', () => {
  const balance = 10000;
  const ZERO_COST_SETTINGS = {
    ...DEFAULT_SETTINGS,
    takerFeePct: 0,
    slippagePct: 0,
    defaultFundingRatePct: 0,
  };

  it('scores good long as 10 Low', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 95, target: 110, leverage: 10 },
      balance,
      ZERO_COST_SETTINGS
    );
    const result = calculateRiskScore({
      metrics,
      leverage: 10,
      settings: DEFAULT_SETTINGS,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
    });

    expect(result.score).toBe(10);
    expect(result.band).toBe('Low');
    expect(result.breakdown).toHaveLength(5);
  });

  it('scores good short as 10 Low', () => {
    const metrics = calculateTradeMetrics(
      { side: 'SHORT', entry: 100, stopLoss: 105, target: 90, leverage: 10 },
      balance,
      DEFAULT_SETTINGS
    );
    const result = calculateRiskScore({
      metrics,
      leverage: 10,
      settings: DEFAULT_SETTINGS,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
    });

    expect(result.score).toBe(10);
    expect(result.band).toBe('Low');
  });

  it('floors score at 51 High when stop is beyond liquidation', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 85, leverage: 10 },
      balance,
      DEFAULT_SETTINGS
    );
    const result = calculateRiskScore({
      metrics,
      leverage: 10,
      settings: DEFAULT_SETTINGS,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
    });

    expect(result.score).toBe(51);
    expect(result.band).toBe('High');
  });

  it('scores no-stop 20x trade with qty 100 as 75 High', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, quantity: 100, leverage: 20 },
      balance,
      ZERO_COST_SETTINGS
    );
    const result = calculateRiskScore({
      metrics,
      leverage: 20,
      settings: DEFAULT_SETTINGS,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
    });

    expect(result.score).toBe(75);
    expect(result.band).toBe('High');
  });

  it('gives 0 R:R points when no stop but target is provided', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, quantity: 20, target: 110, leverage: 5 },
      balance,
      DEFAULT_SETTINGS
    );
    const result = calculateRiskScore({
      metrics,
      leverage: 5,
      settings: DEFAULT_SETTINGS,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
    });

    const rrFactor = result.breakdown.find((b) => b.factor === 'Risk:reward');
    expect(rrFactor.points).toBe(0);
    expect(result.score).toBe(51);
  });

  it('caps score at 100 Critical', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, quantity: 500, leverage: 50 },
      balance,
      DEFAULT_SETTINGS
    );
    const result = calculateRiskScore({
      metrics,
      leverage: 50,
      settings: DEFAULT_SETTINGS,
      projectedOpenRiskPct: 12,
      currentDrawdownPct: 15,
    });

    expect(result.score).toBe(95);
    expect(result.band).toBe('Critical');
  });

  it('triggers warnings without adding score points', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 95, target: 110, leverage: 15 },
      balance,
      DEFAULT_SETTINGS
    );
    const warnings = generateTradeWarnings({
      symbol: 'BTCUSDT',
      leverage: 15,
      metrics,
      settings: DEFAULT_SETTINGS,
      availableMargin: 50,
      balance,
      todayRealizedPnl: -400,
      consecutiveLosses: 3,
      openTrades: [{ symbol: 'BTCUSDT', metrics: { notional: 5000 } }],
    });

    expect(warnings.length).toBe(5);
  });
});
