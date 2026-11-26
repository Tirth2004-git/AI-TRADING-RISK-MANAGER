import { describe, expect, it } from 'vitest';
import { runStressTest } from '../../src/risk/stress.risk.js';

describe('stress.risk', () => {
  const baseTrade = {
    _id: 't1',
    symbol: 'BTCUSDT',
    side: 'LONG',
    entry: 100,
    stopLoss: 95,
    leverage: 10,
    quantity: 20,
    remainingQuantity: 20,
    markPrice: 100,
    metrics: { liquidation: 90.5 },
  };

  it('exits at stop with -100 change when stops work on -20% shock', () => {
    const res = runStressTest({
      openTrades: [baseTrade],
      balance: 10000,
      settings: { takerFeePct: 0, slippagePct: 0 },
      shocks: [-20],
      mode: 'STOPS_WORK',
    });

    expect(res.scenarios[0].totalChange).toBeCloseTo(-100, 4);
    expect(res.scenarios[0].liquidatedCount).toBe(0);
    expect(res.scenarios[0].equityAfter).toBeCloseTo(9900, 4);
  });

  it('liquidates at full isolated margin (-200) in GAP mode on -20% shock', () => {
    const res = runStressTest({
      openTrades: [baseTrade],
      balance: 10000,
      settings: { takerFeePct: 0, slippagePct: 0 },
      shocks: [-20],
      mode: 'GAP',
    });

    expect(res.scenarios[0].totalChange).toBeCloseTo(-200, 4);
    expect(res.scenarios[0].liquidatedCount).toBe(1);
    expect(res.scenarios[0].positions[0].liquidated).toBe(true);
    expect(res.scenarios[0].equityAfter).toBeCloseTo(9800, 4);
  });
});
