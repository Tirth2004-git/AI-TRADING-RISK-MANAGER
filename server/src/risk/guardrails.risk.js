import { EPS, RISK_BANDS } from './constants.js';
import { calculateRemainingOpenRisk } from './lifecycle.risk.js';
import {
  getBalanceBeforeDate,
  getKolkataDayBounds,
  getKolkataWeekBounds,
  getTodayRealizedPnl,
  getWeekRealizedPnl,
} from '../utils/date.js';

/**
 * Evaluate account and trade-level circuit breakers (ALLOW / WARN / BLOCK).
 */
export function evaluateGuardrails({
  settings,
  openTrades = [],
  closedTrades = [],
  allTradesOpenedTodayCount = null,
  ledgerEntries = [],
  symbolProfilesMap = new Map(),
  candidate = null, // { symbol, side, amountAtRisk, riskBand, warnings }
  balance,
  openRiskAmount = 0,
  now = new Date(),
}) {
  const blockReasons = [];
  const warnReasons = [];

  const { start: dayStart } = getKolkataDayBounds(now);
  const { start: weekStart } = getKolkataWeekBounds(now);

  const dayStartBalance = getBalanceBeforeDate(
    settings.startingBalance,
    closedTrades,
    ledgerEntries,
    dayStart
  );
  const weekStartBalance = getBalanceBeforeDate(
    settings.startingBalance,
    closedTrades,
    ledgerEntries,
    weekStart
  );

  const todayPnl = getTodayRealizedPnl(closedTrades, now);
  const weekPnl = getWeekRealizedPnl(closedTrades, now);

  const dailyLoss = todayPnl < 0 ? Math.abs(todayPnl) : 0;
  const weeklyLoss = weekPnl < 0 ? Math.abs(weekPnl) : 0;

  const maxDailyLossPct = settings.maxDailyLossPct ?? 3;
  const maxWeeklyLossPct = settings.maxWeeklyLossPct ?? 7;
  const maxTradesPerDay = settings.maxTradesPerDay ?? 5;
  const cooldownMinutes = settings.cooldownMinutes ?? 60;
  const cooldownAfterLosses = settings.cooldownAfterLosses ?? 3;
  const maxOpenRiskPct = settings.maxOpenRiskPct ?? 5;
  const maxGroupRiskPct = settings.maxGroupRiskPct ?? 3;

  const dailyLossPct = dayStartBalance > 0 ? (dailyLoss / dayStartBalance) * 100 : 0;
  const weeklyLossPct = weekStartBalance > 0 ? (weeklyLoss / weekStartBalance) * 100 : 0;

  // 1. Daily loss limit
  if (dayStartBalance > 0 && dailyLossPct >= maxDailyLossPct - EPS) {
    blockReasons.push(
      `Daily loss limit reached (${dailyLossPct.toFixed(2)}% >= ${maxDailyLossPct}%).`
    );
  } else if (dayStartBalance > 0 && dailyLossPct >= 0.8 * maxDailyLossPct - EPS) {
    warnReasons.push(
      `Daily loss is at ${dailyLossPct.toFixed(2)}% (80%+ of ${maxDailyLossPct}% limit).`
    );
  }

  // 2. Weekly loss limit
  if (weekStartBalance > 0 && weeklyLossPct >= maxWeeklyLossPct - EPS) {
    blockReasons.push(
      `Weekly loss limit reached (${weeklyLossPct.toFixed(2)}% >= ${maxWeeklyLossPct}%).`
    );
  } else if (weekStartBalance > 0 && weeklyLossPct >= 0.8 * maxWeeklyLossPct - EPS) {
    warnReasons.push(
      `Weekly loss is at ${weeklyLossPct.toFixed(2)}% (80%+ of ${maxWeeklyLossPct}% limit).`
    );
  }

  // 3. Max trades per day
  let tradesToday = allTradesOpenedTodayCount;
  if (tradesToday === null) {
    const startMs = dayStart.getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;
    tradesToday = [...openTrades, ...closedTrades].filter((t) => {
      if (t.status === 'CANCELLED') return false;
      const ms = new Date(t.openedAt || t.createdAt || 0).getTime();
      return ms >= startMs && ms < endMs;
    }).length;
  }

  if (tradesToday >= maxTradesPerDay) {
    blockReasons.push(
      `Daily trade count limit reached (${tradesToday} >= ${maxTradesPerDay} trades today).`
    );
  } else if (tradesToday >= Math.ceil(0.8 * maxTradesPerDay)) {
    warnReasons.push(
      `Approaching daily trade limit (${tradesToday} of ${maxTradesPerDay} trades today).`
    );
  }

  // 4. Loss streak cooldown
  const sortedClosed = [...closedTrades].sort(
    (a, b) => new Date(a.closedAt || 0).getTime() - new Date(b.closedAt || 0).getTime()
  );
  let losingStreak = 0;
  for (let i = sortedClosed.length - 1; i >= 0; i -= 1) {
    if ((sortedClosed[i].realizedPnl ?? 0) < 0) losingStreak += 1;
    else break;
  }

  let cooldownRemainingMinutes = 0;
  if (losingStreak >= cooldownAfterLosses && cooldownMinutes > 0 && sortedClosed.length > 0) {
    const lastClosedAt = new Date(sortedClosed[sortedClosed.length - 1].closedAt).getTime();
    const elapsedMin = (now.getTime() - lastClosedAt) / (60 * 1000);
    if (elapsedMin < cooldownMinutes - EPS) {
      cooldownRemainingMinutes = Math.ceil(cooldownMinutes - elapsedMin);
      blockReasons.push(
        `Loss cooldown active after ${losingStreak} consecutive losses (${cooldownRemainingMinutes}m remaining).`
      );
    }
  }

  // 5. Open risk %
  const projectedOpenRisk = openRiskAmount + (candidate?.amountAtRisk ?? 0);
  const projectedOpenRiskPct = balance > 0 ? (projectedOpenRisk / balance) * 100 : 0;

  if (projectedOpenRiskPct > maxOpenRiskPct + EPS) {
    blockReasons.push(
      `Open risk (${projectedOpenRiskPct.toFixed(2)}%) exceeds max open risk (${maxOpenRiskPct}%).`
    );
  } else if (projectedOpenRiskPct >= 0.8 * maxOpenRiskPct - EPS) {
    warnReasons.push(
      `Open risk is at ${projectedOpenRiskPct.toFixed(2)}% (80%+ of ${maxOpenRiskPct}% limit).`
    );
  }

  // 6. Same-direction correlation group risk %
  const groupSideRisk = new Map();
  for (const trade of openTrades) {
    const profile = symbolProfilesMap.get(trade.symbol);
    const group = profile?.correlationGroup || trade.symbol;
    const key = `${group}:${trade.side}`;
    const risk = Number.isFinite(trade.entry)
      ? calculateRemainingOpenRisk(trade, settings)
      : trade.metrics?.amountAtRisk ?? 0;
    groupSideRisk.set(key, (groupSideRisk.get(key) || 0) + risk);
  }

  if (candidate) {
    const profile = symbolProfilesMap.get(candidate.symbol);
    const group = profile?.correlationGroup || candidate.symbol;
    const key = `${group}:${candidate.side}`;
    groupSideRisk.set(key, (groupSideRisk.get(key) || 0) + (candidate.amountAtRisk ?? 0));
  }

  let maxObservedGroupPct = 0;
  for (const [key, amt] of groupSideRisk.entries()) {
    const pct = balance > 0 ? (amt / balance) * 100 : 0;
    if (pct > maxObservedGroupPct) maxObservedGroupPct = pct;

    if (pct > maxGroupRiskPct + EPS) {
      blockReasons.push(
        `Correlation group ${key} risk (${pct.toFixed(2)}%) exceeds limit (${maxGroupRiskPct}%).`
      );
    } else if (pct >= 0.8 * maxGroupRiskPct - EPS) {
      warnReasons.push(
        `Correlation group ${key} risk is at ${pct.toFixed(2)}% (80%+ of ${maxGroupRiskPct}% limit).`
      );
    }
  }

  // 7. Critical risk score band
  if (candidate?.riskBand === RISK_BANDS.CRITICAL) {
    blockReasons.push('Trade risk score is Critical.');
  }

  if (candidate?.warnings?.length) {
    for (const w of candidate.warnings) {
      warnReasons.push(w);
    }
  }

  const status =
    blockReasons.length > 0 ? 'BLOCK' : warnReasons.length > 0 ? 'WARN' : 'ALLOW';

  return {
    status,
    reasons: blockReasons.length > 0 ? blockReasons : warnReasons,
    blockReasons,
    warnReasons,
    limits: {
      dailyLossPct,
      maxDailyLossPct,
      weeklyLossPct,
      maxWeeklyLossPct,
      tradesToday,
      maxTradesPerDay,
      cooldownRemainingMinutes,
      openRiskPct: projectedOpenRiskPct,
      maxOpenRiskPct,
      groupRiskPct: maxObservedGroupPct,
      maxGroupRiskPct,
    },
  };
}
