import { describe, expect, it } from 'vitest';
import {
  calculateCorrelationMatrix,
  calculateDrawdownRecovery,
  calculateKelly,
  calculateRiskOfRuin,
} from '../../src/risk/advanced.risk.js';

describe('advanced.risk', () => {
  it('computes analytical Risk of Ruin and rejects invalid inputs', () => {
    const ror = calculateRiskOfRuin({
      winRatePct: 55,
      avgWin: 200,
      avgLoss: 100,
      riskPerTradePct: 1,
      ruinThresholdPct: 50,
    });
    expect(ror.eligible).toBe(true);
    expect(ror.riskOfRuinPct).toBeGreaterThanOrEqual(0);
    expect(ror.riskOfRuinPct).toBeLessThan(1);

    const negEdge = calculateRiskOfRuin({
      winRatePct: 30,
      avgWin: 100,
      avgLoss: 100,
      riskPerTradePct: 2,
    });
    expect(negEdge.riskOfRuinPct).toBe(100);

    const invalid = calculateRiskOfRuin({ winRatePct: 50, avgWin: 0, avgLoss: 100, riskPerTradePct: 1 });
    expect(invalid.eligible).toBe(false);
  });

  it('computes Full, Half, Quarter, and custom Kelly without negative sizing', () => {
    const k = calculateKelly({ winRatePct: 50, avgWin: 200, avgLoss: 100, customFraction: 0.1 });
    expect(k.eligible).toBe(true);
    expect(k.fullKellyPct).toBeCloseTo(25, 4);
    expect(k.halfKellyPct).toBeCloseTo(12.5, 4);
    expect(k.quarterKellyPct).toBeCloseTo(6.25, 4);
    expect(k.customKellyPct).toBeCloseTo(2.5, 4);

    const negK = calculateKelly({ winRatePct: 20, avgWin: 100, avgLoss: 100 });
    expect(negK.fullKellyPct).toBe(0);
  });

  it('computes drawdown recovery % and historical recovery duration', () => {
    const rec = calculateDrawdownRecovery({
      currentDrawdownPct: 20,
      maxDrawdownPct: 25,
      currentBalance: 8000,
      peakBalance: 10000,
      equityCurve: [
        { equity: 10000, drawdownPct: 0 },
        { equity: 8000, drawdownPct: 20 },
        { equity: 9000, drawdownPct: 10 },
        { equity: 10200, drawdownPct: 0 },
      ],
    });
    expect(rec.requiredRecoveryPct).toBeCloseTo(25, 4);
    expect(rec.historicalMaxRecoveryTrades).toBe(3);
  });

  it('computes Pearson correlation matrix and handles insufficient data', () => {
    const empty = calculateCorrelationMatrix({});
    expect(empty.eligible).toBe(false);

    const corr = calculateCorrelationMatrix({
      BTCUSDT: [100, 110, 105, 120],
      ETHUSDT: [10, 11, 10.5, 12],
    });
    expect(corr.eligible).toBe(true);
    expect(corr.matrix.BTCUSDT.ETHUSDT).toBeCloseTo(1, 4);
  });
});
