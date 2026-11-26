/**
 * Compute equity curve (consistent with ledger cash flows), cash-flow-neutral
 * performance index drawdowns, and closed-trade performance metrics.
 */
export function calculatePerformance(
  closedTrades = [],
  startingBalance = 10000,
  ledgerEntries = []
) {
  const sortedClosed = [...closedTrades].sort((a, b) => {
    const ta = a.closedAt ? new Date(a.closedAt).getTime() : 0;
    const tb = b.closedAt ? new Date(b.closedAt).getTime() : 0;
    return ta - tb;
  });

  // 1. Chronological events for cash-flow-neutral Performance Index
  const perfEvents = [];
  for (const trade of sortedClosed) {
    if (Array.isArray(trade.exits) && trade.exits.length > 0) {
      for (const ex of trade.exits) {
        perfEvents.push({
          kind: 'EXIT',
          time: new Date(ex.time || trade.closedAt || 0).getTime(),
          amount: Number.isFinite(ex.pnl) ? ex.pnl : 0,
        });
      }
    } else {
      perfEvents.push({
        kind: 'EXIT',
        time: new Date(trade.closedAt || 0).getTime(),
        amount: Number.isFinite(trade.realizedPnl) ? trade.realizedPnl : 0,
      });
    }
  }

  for (const entry of ledgerEntries) {
    if (!Number.isFinite(entry.amount)) continue;
    perfEvents.push({
      kind: 'CASHFLOW',
      time: new Date(entry.date || entry.createdAt || 0).getTime(),
      amount: entry.type === 'DEPOSIT' ? entry.amount : -entry.amount,
    });
  }

  perfEvents.sort((a, b) => a.time - b.time);

  let runningBalance = startingBalance;
  let perfIndex = 100;
  let peakIndex = 100;
  let maxDrawdownPct = 0;

  for (const ev of perfEvents) {
    if (ev.kind === 'CASHFLOW') {
      runningBalance += ev.amount;
    } else {
      perfIndex =
        runningBalance > 0 ? Math.max(0, perfIndex * (1 + ev.amount / runningBalance)) : 0;
      runningBalance += ev.amount;
      if (perfIndex > peakIndex) {
        peakIndex = perfIndex;
      }
      const dd = peakIndex > 0 ? Math.max(0, ((peakIndex - perfIndex) / peakIndex) * 100) : 0;
      if (dd > maxDrawdownPct) {
        maxDrawdownPct = dd;
      }
    }
  }

  const currentDrawdownPct =
    peakIndex > 0 ? Math.max(0, ((peakIndex - perfIndex) / peakIndex) * 100) : 0;

  // 2. Equity curve combining closed trades and ledger cash flows (no double counting)
  const curveEvents = [
    ...sortedClosed.map((trade) => ({
      kind: 'TRADE',
      tradeId: trade._id ? String(trade._id) : null,
      symbol: trade.symbol || null,
      time: trade.closedAt || trade.updatedAt || null,
      ms: trade.closedAt ? new Date(trade.closedAt).getTime() : 0,
      amount: Number.isFinite(trade.realizedPnl) ? trade.realizedPnl : 0,
    })),
    ...ledgerEntries
      .filter((e) => Number.isFinite(e.amount))
      .map((entry) => ({
        kind: entry.type,
        tradeId: null,
        symbol: entry.type,
        time: entry.date || entry.createdAt || null,
        ms: new Date(entry.date || entry.createdAt || 0).getTime(),
        amount: entry.type === 'DEPOSIT' ? entry.amount : -entry.amount,
      })),
  ].sort((a, b) => a.ms - b.ms);

  let equity = startingBalance;
  let peak = startingBalance;

  const equityCurve = [
    {
      index: 0,
      kind: 'START',
      tradeId: null,
      symbol: null,
      closedAt: null,
      pnl: 0,
      equity: startingBalance,
      peak: startingBalance,
      drawdownPct: 0,
    },
  ];

  curveEvents.forEach((ev, idx) => {
    equity += ev.amount;
    if (equity > peak) peak = equity;
    const drawdownPct = peak > 0 ? Math.max(0, ((peak - equity) / peak) * 100) : 0;

    equityCurve.push({
      index: idx + 1,
      kind: ev.kind,
      tradeId: ev.tradeId,
      symbol: ev.symbol,
      closedAt: ev.time,
      pnl: ev.amount,
      equity,
      peak,
      drawdownPct,
    });
  });

  // 3. Closed-trade statistics
  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalPnl = 0;
  let totalFees = 0;
  let rSum = 0;
  let rCount = 0;

  for (const trade of sortedClosed) {
    const pnl = Number.isFinite(trade.realizedPnl) ? trade.realizedPnl : 0;
    totalPnl += pnl;
    totalFees += Number.isFinite(trade.fees) ? trade.fees : 0;

    if (pnl > 0) {
      wins += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      losses += 1;
      grossLoss += Math.abs(pnl);
    } else {
      breakevens += 1;
    }

    if (typeof trade.rMultiple === 'number' && Number.isFinite(trade.rMultiple)) {
      rSum += trade.rMultiple;
      rCount += 1;
    }
  }

  const totalTrades = sortedClosed.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const averageR = rCount > 0 ? rSum / rCount : 0;
  const expectancy = totalTrades > 0 ? totalPnl / totalTrades : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  let currentLosingStreak = 0;
  for (let i = sortedClosed.length - 1; i >= 0; i -= 1) {
    const pnl = Number.isFinite(sortedClosed[i].realizedPnl)
      ? sortedClosed[i].realizedPnl
      : 0;
    if (pnl < 0) {
      currentLosingStreak += 1;
    } else {
      break;
    }
  }

  return {
    startingBalance,
    currentBalance: runningBalance,
    peakBalance: peak,
    performanceIndex: perfIndex,
    peakPerformanceIndex: peakIndex,
    totalPnl,
    totalFees,
    totalTrades,
    wins,
    losses,
    breakevens,
    winRate,
    averageR,
    expectancy,
    profitFactor,
    currentDrawdownPct,
    maxDrawdownPct,
    currentLosingStreak,
    equityCurve,
  };
}
