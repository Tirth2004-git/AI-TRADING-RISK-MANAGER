import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/risk/constants.js';
import { calculateTradeCosts } from '../../src/risk/costs.risk.js';
import { calculateTradeMetrics } from '../../src/risk/trade.risk.js';

describe('costs.risk', () => {
  it('computes V2 costs, net reward, net R:R, and break-even accurately', () => {
    const metrics = calculateTradeMetrics(
      {
        side: 'LONG',
        entry: 100,
        stopLoss: 95,
        target: 110,
        leverage: 10,
        fundingRatePct: 0.01,
        fundingIntervals: 3,
      },
      10000,
      DEFAULT_SETTINGS
    );

    expect(metrics.quantity).toBeCloseTo(19.3237, 3);
    expect(metrics.margin).toBeCloseTo(193.24, 2);
    expect(metrics.amountAtRisk).toBeCloseTo(100, 4);
    expect(metrics.netReward).toBeCloseTo(190.63, 2);
    expect(metrics.netRiskReward).toBeCloseTo(1.9063, 3);
    expect(metrics.breakEven).toBeCloseTo(100.1301, 4);
  });

  it('never reduces risk when expected funding is favorable (negative funding for LONG)', () => {
    const costs = calculateTradeCosts({
      side: 'LONG',
      entry: 100,
      stopLoss: 95,
      target: 110,
      takerFeePct: 0.05,
      slippagePct: 0.05,
      fundingRatePct: -0.05,
      fundingIntervals: 5,
    });

    expect(costs.fundingPerUnit).toBe(0);
  });

  it('applies symbol profile qtyStep, minNotional, and maxLeverage', () => {
    const profile = {
      symbol: 'BTCUSDT',
      maintenanceMarginPct: 0.4,
      maxLeverage: 20,
      qtyStep: 0.5,
      minNotional: 100,
      correlationGroup: 'BTC',
      beta: 1,
    };

    const metrics = calculateTradeMetrics(
      { side: 'LONG', entry: 100, stopLoss: 95, target: 110, leverage: 10 },
      10000,
      { ...DEFAULT_SETTINGS, takerFeePct: 0, slippagePct: 0, defaultFundingRatePct: 0 },
      profile
    );

    expect(metrics.quantity).toBe(20);
    expect(metrics.liquidation).toBeCloseTo(90.4, 4);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 100, stopLoss: 95, leverage: 25 },
        10000,
        DEFAULT_SETTINGS,
        profile
      )
    ).toThrow(/profile limit/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 10, quantity: 0.4, leverage: 5 },
        10000,
        DEFAULT_SETTINGS,
        profile
      )
    ).toThrow(/0 after rounding/i);

    expect(() =>
      calculateTradeMetrics(
        { side: 'LONG', entry: 10, quantity: 5, leverage: 5 },
        10000,
        DEFAULT_SETTINGS,
        profile
      )
    ).toThrow(/minimum notional/i);
  });
});
