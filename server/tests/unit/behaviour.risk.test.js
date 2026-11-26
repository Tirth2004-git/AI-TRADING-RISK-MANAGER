import { describe, expect, it } from 'vitest';
import { analyzeBehaviour } from '../../src/risk/behaviour.risk.js';

describe('behaviour.risk', () => {
  it('detects revengeTrade, overtrading, widenedStop, and overrideUsed', () => {
    const trades = [
      {
        _id: '1',
        symbol: 'BTCUSDT',
        side: 'LONG',
        status: 'CLOSED',
        openedAt: '2026-11-26T08:00:00+05:30',
        closedAt: '2026-11-26T09:00:00+05:30',
        realizedPnl: -100,
        rMultiple: -1,
        fees: 2,
        setupTag: 'BREAKOUT',
        metrics: { amountAtRiskPct: 1 },
      },
      {
        _id: '2',
        symbol: 'BTCUSDT',
        side: 'LONG',
        status: 'CLOSED',
        openedAt: '2026-11-26T09:15:00+05:30',
        closedAt: '2026-11-26T09:45:00+05:30',
        realizedPnl: 200,
        rMultiple: 1,
        fees: 2,
        setupTag: 'BREAKOUT',
        metrics: { amountAtRiskPct: 2 },
        stopHistory: [{ from: 95, to: 90, reason: 'Noise' }],
        overrideReason: 'Forced override after checking chart structure',
      },
    ];

    const res = analyzeBehaviour(trades, { maxTradesPerDay: 1 });
    expect(res.flagCounts.revengeTrade).toBe(1);
    expect(res.flagCounts.overtrading).toBe(2);
    expect(res.flagCounts.widenedStop).toBe(1);
    expect(res.flagCounts.overrideUsed).toBe(1);
    expect(res.bySetup[0].smallSample).toBe(true);
  });

  it('excludes CANCELLED trades from overtrading and respects Asia/Kolkata day boundaries', () => {
    const trades = [
      {
        _id: '1',
        symbol: 'BTCUSDT',
        side: 'LONG',
        status: 'CLOSED',
        stopLoss: 95,
        openedAt: '2026-11-26T23:45:00+05:30',
        closedAt: '2026-11-26T23:55:00+05:30',
        realizedPnl: 100,
        rMultiple: 1,
        fees: 1,
        metrics: { amountAtRiskPct: 1 },
      },
      {
        _id: '2',
        symbol: 'ETHUSDT',
        side: 'LONG',
        status: 'CANCELLED',
        stopLoss: 95,
        openedAt: '2026-11-26T23:50:00+05:30',
        metrics: { amountAtRiskPct: 1 },
      },
      {
        _id: '3',
        symbol: 'SOLUSDT',
        side: 'LONG',
        status: 'OPEN',
        stopLoss: 95,
        openedAt: '2026-11-27T00:15:00+05:30',
        metrics: { amountAtRiskPct: 1 },
      },
    ];

    const res = analyzeBehaviour(trades, { maxTradesPerDay: 1 });
    expect(res.flagCounts.overtrading).toBe(0);
    expect(res.flaggedTrades).toHaveLength(0);
  });

  it('detects noStopLoss, excessiveLeverage, poorRiskReward, outsidePlan, and plannedVsActual', () => {
    const res = analyzeBehaviour(
      [
        {
          _id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          status: 'CLOSED',
          entry: 100,
          exitPrice: 105,
          initialStop: 95,
          stopLoss: 96,
          leverage: 25,
          quantity: 10,
          initialQuantity: 10,
          realizedPnl: 50,
          rMultiple: 0.5,
          followedPlan: false,
          openedAt: '2026-11-26T10:00:00+05:30',
          closedAt: '2026-11-26T11:00:00+05:30',
          metrics: { amountAtRiskPct: 1, netRiskReward: 1.0 },
        },
        {
          _id: '2',
          symbol: 'ETHUSDT',
          side: 'LONG',
          status: 'OPEN',
          entry: 100,
          stopLoss: null,
          leverage: 5,
          quantity: 10,
          openedAt: '2026-11-26T12:00:00+05:30',
          metrics: { amountAtRiskPct: 1 },
        },
      ],
      { maxLeverage: 10, minRiskReward: 1.5 }
    );

    expect(res.flagCounts.excessiveLeverage).toBe(1);
    expect(res.flagCounts.poorRiskReward).toBe(1);
    expect(res.flagCounts.outsidePlan).toBe(1);
    expect(res.flagCounts.noStopLoss).toBe(1);
    expect(res.flaggedTrades[0].plannedVsActual.stopChanged).toBe(true);
  });
});
