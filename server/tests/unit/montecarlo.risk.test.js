import { describe, expect, it } from 'vitest';
import { runMonteCarlo } from '../../src/risk/montecarlo.risk.js';

describe('montecarlo.risk', () => {
  it('blocks simulation below 30 closed trades', () => {
    const res = runMonteCarlo({ rMultiples: [1, -1, 2], startingEquity: 10000 });
    expect(res.eligible).toBe(false);
    expect(res.tradesNeeded).toBe(27);
    expect(res.label).toMatch(/not a prediction/i);
  });

  it('runs deterministic 10000x100 simulation with fixed seed', () => {
    const rs = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 1.5 : -1));
    const run1 = runMonteCarlo({
      rMultiples: rs,
      startingEquity: 10000,
      riskFraction: 0.01,
      runs: 1000,
      tradesPerRun: 100,
      seed: 12345,
    });
    const run2 = runMonteCarlo({
      rMultiples: rs,
      startingEquity: 10000,
      riskFraction: 0.01,
      runs: 1000,
      tradesPerRun: 100,
      seed: 12345,
    });

    expect(run1.eligible).toBe(true);
    expect(run1.medianFinalEquity).toBe(run2.medianFinalEquity);
    expect(run1.p5FinalEquity).toBe(run2.p5FinalEquity);
    expect(run1.medianFinalEquity).toBeGreaterThan(10000);
  });
});
