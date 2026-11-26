import { EPS, TRADE_STATUSES } from './constants.js';
import { getKolkataDayBounds } from '../utils/date.js';

const REVENGE_WINDOW_MS = 30 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getKolkataWeekday(dateValue) {
  const d = new Date(dateValue);
  const shifted = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return WEEKDAYS[shifted.getUTCDay()];
}

function summarizeGroup(trades) {
  const count = trades.length;
  let wins = 0;
  let netPnl = 0;
  let totalFees = 0;
  let rSum = 0;
  let rCount = 0;

  for (const t of trades) {
    const pnl = Number.isFinite(t.realizedPnl) ? t.realizedPnl : 0;
    netPnl += pnl;
    totalFees += Number.isFinite(t.fees) ? t.fees : 0;
    if (pnl > 0) wins += 1;
    if (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)) {
      rSum += t.rMultiple;
      rCount += 1;
    }
  }

  return {
    count,
    winRate: count > 0 ? (wins / count) * 100 : 0,
    averageR: rCount > 0 ? rSum / rCount : 0,
    netPnl,
    totalFees,
    smallSample: count < 10,
  };
}

function groupAndSummarize(trades, keySelector) {
  const map = new Map();
  for (const t of trades) {
    const key = keySelector(t) || 'UNTAGGED';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return Array.from(map.entries())
    .map(([key, items]) => ({ key, ...summarizeGroup(items) }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Compare planned trade parameters with actual execution and exit outcomes.
 */
export function computePlannedVsActual(trade) {
  const plannedQty = trade.initialQuantity ?? trade.quantity ?? 0;
  const exitedQty = Array.isArray(trade.exits)
    ? trade.exits.reduce((s, ex) => s + (ex.quantity || 0), 0)
    : trade.status === TRADE_STATUSES.CLOSED
    ? plannedQty
    : 0;
  const plannedStop = trade.initialStop ?? trade.stopLoss ?? null;
  const actualStop = trade.stopLoss ?? null;
  const plannedRR = trade.metrics?.netRiskReward ?? trade.metrics?.riskReward ?? null;

  return {
    entry: trade.entry,
    exitPrice: trade.exitPrice ?? null,
    plannedStop,
    actualStop,
    stopChanged:
      plannedStop !== null && actualStop !== null
        ? Math.abs(plannedStop - actualStop) > EPS
        : plannedStop !== actualStop,
    plannedQty,
    exitedQty,
    plannedRR,
    actualR: trade.rMultiple ?? null,
    realizedPnl: trade.realizedPnl ?? null,
    followedPlan: trade.followedPlan ?? null,
  };
}

/**
 * Detect behavioural flags and compute segmented analytics across trades.
 */
export function analyzeBehaviour(allTrades = [], settings = {}) {
  const maxTradesPerDay = settings.maxTradesPerDay ?? 5;
  const maxLeverage = settings.maxLeverage ?? 10;
  const minRiskReward = settings.minRiskReward ?? 1.5;
  const sortedByOpen = [...allTrades].sort(
    (a, b) =>
      new Date(a.openedAt || a.createdAt || 0).getTime() -
      new Date(b.openedAt || b.createdAt || 0).getTime()
  );

  const closedTrades = allTrades
    .filter((t) => t.status === TRADE_STATUSES.CLOSED)
    .sort(
      (a, b) =>
        new Date(a.closedAt || 0).getTime() - new Date(b.closedAt || 0).getTime()
    );

  // Count non-cancelled trades opened per Kolkata day
  const dayCounts = new Map();
  for (const t of sortedByOpen) {
    if (t.status === TRADE_STATUSES.CANCELLED) continue;
    const { start } = getKolkataDayBounds(new Date(t.openedAt || t.createdAt || 0));
    const key = start.toISOString();
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }

  const flagCounts = {
    revengeTrade: 0,
    overtrading: 0,
    widenedStop: 0,
    overrideUsed: 0,
    noStopLoss: 0,
    excessiveLeverage: 0,
    poorRiskReward: 0,
    outsidePlan: 0,
  };

  const flaggedTrades = sortedByOpen.map((trade) => {
    const openedMs = new Date(trade.openedAt || trade.createdAt || 0).getTime();
    const flags = [];

    // 1. Revenge trade: opened <= 30m after a losing closed trade with higher risk %
    const tradeRiskPct = trade.metrics?.amountAtRiskPct ?? 0;
    const recentLoss = [...closedTrades]
      .reverse()
      .find((ct) => {
        if (!ct.closedAt || (ct.realizedPnl ?? 0) >= 0) return false;
        const closedMs = new Date(ct.closedAt).getTime();
        return openedMs >= closedMs && openedMs - closedMs <= REVENGE_WINDOW_MS;
      });

    if (
      recentLoss &&
      tradeRiskPct > (recentLoss.metrics?.amountAtRiskPct ?? 0) + EPS
    ) {
      flags.push('revengeTrade');
      flagCounts.revengeTrade += 1;
    }

    // 2. Overtrading (exclude CANCELLED trades)
    const { start } = getKolkataDayBounds(new Date(openedMs));
    if (
      trade.status !== TRADE_STATUSES.CANCELLED &&
      (dayCounts.get(start.toISOString()) || 0) > maxTradesPerDay
    ) {
      flags.push('overtrading');
      flagCounts.overtrading += 1;
    }

    // 3. Widened stop
    const widened = (trade.stopHistory || []).some((move) =>
      trade.side === 'LONG' ? move.to < move.from - EPS : move.to > move.from + EPS
    );
    if (widened) {
      flags.push('widenedStop');
      flagCounts.widenedStop += 1;
    }

    // 4. Override used
    if (trade.overrideReason && trade.overrideReason.trim().length > 0) {
      flags.push('overrideUsed');
      flagCounts.overrideUsed += 1;
    }

    // 5. No stop-loss
    if (trade.stopLoss === null || trade.stopLoss === undefined) {
      flags.push('noStopLoss');
      flagCounts.noStopLoss += 1;
    }

    // 6. Excessive leverage
    if (trade.leverage > maxLeverage + EPS) {
      flags.push('excessiveLeverage');
      flagCounts.excessiveLeverage += 1;
    }

    // 7. Poor risk:reward
    const rr = trade.metrics?.netRiskReward ?? trade.metrics?.riskReward;
    if (rr !== null && rr !== undefined && rr < minRiskReward - EPS) {
      flags.push('poorRiskReward');
      flagCounts.poorRiskReward += 1;
    }

    // 8. Outside recorded plan
    if (trade.followedPlan === false) {
      flags.push('outsidePlan');
      flagCounts.outsidePlan += 1;
    }

    return {
      tradeId: trade._id ? String(trade._id) : null,
      symbol: trade.symbol,
      side: trade.side,
      status: trade.status,
      openedAt: trade.openedAt || trade.createdAt,
      plannedVsActual: computePlannedVsActual(trade),
      flags,
    };
  });

  return {
    flagCounts,
    flaggedTrades: flaggedTrades.filter((t) => t.flags.length > 0),
    bySetup: groupAndSummarize(closedTrades, (t) => t.setupTag || 'UNTAGGED'),
    bySymbol: groupAndSummarize(closedTrades, (t) => t.symbol),
    bySide: groupAndSummarize(closedTrades, (t) => t.side),
    byWeekday: groupAndSummarize(closedTrades, (t) =>
      getKolkataWeekday(t.closedAt || t.openedAt)
    ),
  };
}
