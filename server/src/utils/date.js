const KOLKATA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Return UTC [start, end) bounds for the current calendar day in Asia/Kolkata (UTC+05:30).
 */
export function getKolkataDayBounds(referenceDate = new Date()) {
  const shiftedMs = referenceDate.getTime() + KOLKATA_OFFSET_MS;
  const shiftedDayStartMs = Math.floor(shiftedMs / DAY_MS) * DAY_MS;
  const startUtc = new Date(shiftedDayStartMs - KOLKATA_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + DAY_MS);
  return { start: startUtc, end: endUtc };
}

/**
 * Return UTC [start, end) bounds for the current week (Monday 00:00 IST) in Asia/Kolkata.
 */
export function getKolkataWeekBounds(referenceDate = new Date()) {
  const { start: dayStart } = getKolkataDayBounds(referenceDate);
  const shiftedDayStart = new Date(dayStart.getTime() + KOLKATA_OFFSET_MS);
  const dayOfWeek = shiftedDayStart.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const weekStart = new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  return { start: weekStart, end: weekEnd };
}

/**
 * Sum realized PnL of closed trades whose closedAt falls within today's Asia/Kolkata day.
 */
export function getTodayRealizedPnl(closedTrades = [], referenceDate = new Date()) {
  const { start, end } = getKolkataDayBounds(referenceDate);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return closedTrades.reduce((sum, trade) => {
    if (!trade.closedAt) return sum;
    const closedMs = new Date(trade.closedAt).getTime();
    if (closedMs >= startMs && closedMs < endMs && Number.isFinite(trade.realizedPnl)) {
      return sum + trade.realizedPnl;
    }
    return sum;
  }, 0);
}

/**
 * Sum realized PnL of closed trades whose closedAt falls within this Asia/Kolkata week.
 */
export function getWeekRealizedPnl(closedTrades = [], referenceDate = new Date()) {
  const { start, end } = getKolkataWeekBounds(referenceDate);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return closedTrades.reduce((sum, trade) => {
    if (!trade.closedAt) return sum;
    const closedMs = new Date(trade.closedAt).getTime();
    if (closedMs >= startMs && closedMs < endMs && Number.isFinite(trade.realizedPnl)) {
      return sum + trade.realizedPnl;
    }
    return sum;
  }, 0);
}

/**
 * Compute account balance strictly before a given cutoff date.
 */
export function getBalanceBeforeDate(
  startingBalance,
  closedTrades = [],
  ledgerEntries = [],
  cutoffDate
) {
  const cutoffMs = cutoffDate.getTime();
  const pnlBefore = closedTrades.reduce((sum, t) => {
    if (!t.closedAt) return sum;
    const ms = new Date(t.closedAt).getTime();
    return ms < cutoffMs && Number.isFinite(t.realizedPnl) ? sum + t.realizedPnl : sum;
  }, 0);

  const cashBefore = ledgerEntries.reduce((sum, entry) => {
    const ms = new Date(entry.date || entry.createdAt || 0).getTime();
    if (ms >= cutoffMs || !Number.isFinite(entry.amount)) return sum;
    return entry.type === 'DEPOSIT' ? sum + entry.amount : sum - entry.amount;
  }, 0);

  return startingBalance + pnlBefore + cashBefore;
}
