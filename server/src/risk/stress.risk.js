import { TRADE_SIDES } from './constants.js';
import { evaluateMarkState } from './lifecycle.risk.js';

export const DEFAULT_SHOCKS = [-20, -10, -5, 5, 10, 20];

/**
 * Run deterministic stress test across open positions for given % shocks and mode.
 * mode: 'STOPS_WORK' | 'GAP'
 */
export function runStressTest({
  openTrades = [],
  balance,
  settings = {},
  symbolProfilesMap = new Map(),
  shocks = DEFAULT_SHOCKS,
  mode = 'STOPS_WORK',
}) {
  const f = (settings.takerFeePct ?? 0) / 100;
  const s = (settings.slippagePct ?? 0) / 100;

  let currentUnrealized = 0;
  for (const trade of openTrades) {
    currentUnrealized += evaluateMarkState(trade).unrealizedPnl;
  }
  const equityBefore = balance + currentUnrealized;

  const scenarios = shocks.map((shockPct) => {
    let totalChange = 0;
    let liquidatedCount = 0;
    const positions = [];

    for (const trade of openTrades) {
      const remainingQty = trade.remainingQuantity ?? trade.quantity ?? 0;
      if (remainingQty <= 0) continue;

      const profile = symbolProfilesMap.get(trade.symbol);
      const beta = profile?.beta ?? 1;
      const markState = evaluateMarkState(trade);
      const mark = markState.effectiveMark;

      const newPrice = Math.max(0.00000001, mark * (1 + (shockPct * beta) / 100));
      const dir = trade.side === TRADE_SIDES.LONG ? 1 : -1;
      const remainingMargin = (remainingQty * trade.entry) / trade.leverage;
      const liq = trade.metrics?.liquidation ?? null;

      let appliedExit = newPrice;
      const hasStop = trade.stopLoss !== null && trade.stopLoss !== undefined;

      if (mode === 'STOPS_WORK' && hasStop) {
        const stopCrossed =
          trade.side === TRADE_SIDES.LONG
            ? newPrice <= trade.stopLoss
            : newPrice >= trade.stopLoss;
        if (stopCrossed) {
          appliedExit =
            trade.side === TRADE_SIDES.LONG
              ? trade.stopLoss * (1 - s)
              : trade.stopLoss * (1 + s);
        }
      }

      const crossedLiq =
        liq !== null &&
        (trade.side === TRADE_SIDES.LONG ? appliedExit <= liq : appliedExit >= liq);

      const exitFee = remainingQty * appliedExit * f;
      const rawPnlFromEntry = dir * (appliedExit - trade.entry) * remainingQty - exitFee;
      const maxLossFromEntry = -(remainingMargin + exitFee);

      let shockedPnlFromEntry;
      let liquidated = false;

      if (crossedLiq || rawPnlFromEntry <= maxLossFromEntry) {
        liquidated = true;
        liquidatedCount += 1;
        shockedPnlFromEntry = maxLossFromEntry;
      } else {
        shockedPnlFromEntry = rawPnlFromEntry;
      }

      const changeFromMark = shockedPnlFromEntry - markState.unrealizedPnl;
      totalChange += changeFromMark;

      positions.push({
        tradeId: trade._id ? String(trade._id) : null,
        symbol: trade.symbol,
        side: trade.side,
        markPrice: mark,
        newPrice,
        exitPrice: appliedExit,
        liquidated,
        changeFromMark,
      });
    }

    const equityAfter = Math.max(0, equityBefore + totalChange);

    return {
      shockPct,
      mode,
      equityBefore,
      equityAfter,
      totalChange,
      liquidatedCount,
      positions,
    };
  });

  return {
    mode,
    equityBefore,
    scenarios,
  };
}
