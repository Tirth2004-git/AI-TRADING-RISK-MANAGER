import { describe, expect, it } from 'vitest';
import { DEFAULT_DRAWDOWN_TIERS } from '../../src/risk/constants.js';
import { calculateEffectiveRiskPct } from '../../src/risk/sizing.risk.js';

describe('sizing.risk', () => {
  it('applies drawdown-based multiplier tiers', () => {
    const lowDd = calculateEffectiveRiskPct(1, 2, DEFAULT_DRAWDOWN_TIERS);
    expect(lowDd.multiplier).toBe(1);
    expect(lowDd.effectiveRiskPct).toBe(1);

    const midDd = calculateEffectiveRiskPct(1, 6, DEFAULT_DRAWDOWN_TIERS);
    expect(midDd.multiplier).toBe(0.5);
    expect(midDd.effectiveRiskPct).toBe(0.5);

    const highDd = calculateEffectiveRiskPct(1, 10, DEFAULT_DRAWDOWN_TIERS);
    expect(highDd.multiplier).toBe(0.25);
    expect(highDd.effectiveRiskPct).toBe(0.25);
  });
});
