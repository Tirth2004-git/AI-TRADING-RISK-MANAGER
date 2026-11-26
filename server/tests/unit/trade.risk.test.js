import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/risk/constants.js';
import {
  calculateCloseMetrics,
  calculateTradeMetrics,
  computeBalance,
} from '../../src/risk/trade.risk.js';

describe('trade.risk', () => {
  const balance = 10000;
  const ZERO_COST_SETTINGS = {
    ...DEFAULT_SETTINGS,
    takerFeePct: 0,
    slippagePct: 0,
    defaultFundingRatePct: 0,
  };

  it('computes good long metrics accurately', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 95, target: 110, leverage: 10 },
      balance,
      ZERO_COST_SETTINGS
    );

    expect(metrics.quantity).toBeCloseTo(20, 4);
    expect(metrics.margin).toBeCloseTo(200, 4);
    expect(metrics.riskReward).toBeCloseTo(2, 4);
    expect(metrics.liquidation).toBeCloseTo(90.5, 4);
    expect(metrics.stopBeyondLiquidation).toBe(false);
    expect(metrics.amountAtRisk).toBeCloseTo(100, 4);
    expect(metrics.amountAtRiskPct).toBeCloseTo(1, 4);
  });

  it('computes good short metrics accurately', () => {
    const metrics = calculateTradeMetrics(
      { side: 'SHORT', entry: 100, stopLoss: 105, target: 90, leverage: 10 },
      balance,
      ZERO_COST_SETTINGS
    );

    expect(metrics.quantity).toBeCloseTo(20, 4);
    expect(metrics.margin).toBeCloseTo(200, 4);
    expect(metrics.riskReward).toBeCloseTo(2, 4);
    expect(metrics.liquidation).toBeCloseTo(109.5, 4);
    expect(metrics.stopBeyondLiquidation).toBe(false);
  });

  it('uses margin as amountAtRisk when stop is beyond liquidation', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 85, leverage: 10 },
      balance,
      ZERO_COST_SETTINGS
    );

    expect(metrics.quantity).toBeCloseTo(6.6667, 3);
    expect(metrics.stopBeyondLiquidation).toBe(true);
    expect(metrics.amountAtRisk).toBeCloseTo(66.6667, 2);
    expect(metrics.riskReward).toBeNull();
  });

  it('uses margin as amountAtRisk when no stop-loss is provided', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, quantity: 100, leverage: 20 },
      balance,
      ZERO_COST_SETTINGS
    );

    expect(metrics.margin).toBeCloseTo(500, 4);
    expect(metrics.amountAtRisk).toBeCloseTo(500, 4);
    expect(metrics.amountAtRiskPct).toBeCloseTo(5, 4);
    expect(metrics.riskReward).toBeNull();
  });

  it('computes close metrics for good long', () => {
    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 95, target: 110, leverage: 10 },
      balance,
      ZERO_COST_SETTINGS
    );

    const close = calculateCloseMetrics({ side: 'LONG', entry: 100, metrics }, 110, 0);
    expect(close.realizedPnl).toBeCloseTo(200, 4);
    expect(close.rMultiple).toBeCloseTo(2, 4);
  });

  it('computes close metrics for short with fees', () => {
    const metrics = calculateTradeMetrics(
      { side: 'SHORT', entry: 100, stopLoss: 105, target: 90, leverage: 10 },
      balance,
      ZERO_COST_SETTINGS
    );

    const close = calculateCloseMetrics({ side: 'SHORT', entry: 100, metrics }, 90, 5);
    expect(close.realizedPnl).toBeCloseTo(195, 4);
    expect(close.rMultiple).toBeCloseTo(1.95, 4);
  });

  it('computes balance from starting balance and closed trades', () => {
    expect(computeBalance(10000, [{ realizedPnl: 200 }, { realizedPnl: -50 }])).toBe(10150);
  });

  it('rejects invalid inputs with 400 errors', () => {
    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, stopLoss: 95, leverage: 10 },
        0,
        DEFAULT_SETTINGS
      )
    ).toThrow(/balance/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, stopLoss: 105, leverage: 10 },
        balance,
        DEFAULT_SETTINGS
      )
    ).toThrow(/stop-loss/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, stopLoss: 95, target: 98, leverage: 10 },
        balance,
        DEFAULT_SETTINGS
      )
    ).toThrow(/target/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'SHORT', entry: 100, stopLoss: 95, leverage: 10 },
        balance,
        DEFAULT_SETTINGS
      )
    ).toThrow(/stop-loss/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'SHORT', entry: 100, stopLoss: 105, target: 102, leverage: 10 },
        balance,
        DEFAULT_SETTINGS
      )
    ).toThrow(/target/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, leverage: 10 },
        balance,
        DEFAULT_SETTINGS
      )
    ).toThrow(/quantity/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, stopLoss: 95, leverage: 200 },
        balance,
        DEFAULT_SETTINGS
      )
    ).toThrow(/leverage/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, stopLoss: 95, leverage: 100 },
        balance,
        { ...DEFAULT_SETTINGS, maintenanceMarginPct: 1 }
      )
    ).toThrow(/maintenance margin/i);
  });
});
