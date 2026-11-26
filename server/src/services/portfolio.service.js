import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { TRADE_STATUSES } from '../risk/constants.js';
import { calculatePortfolioSummary } from '../risk/portfolio.risk.js';
import { calculatePerformance } from '../risk/performance.risk.js';
import { generatePortfolioWarnings } from '../risk/warnings.risk.js';
import { getTodayRealizedPnl } from '../utils/date.js';
import { scopeQuery } from '../utils/scopeQuery.js';
import { getSettings } from './settings.service.js';

export async function getPortfolioSummary(auth) {
  const [settings, openTrades, closedTrades, ledgerEntries] = await Promise.all([
    getSettings(auth),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.OPEN })).lean(),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED }))
      .sort({ closedAt: 1 })
      .lean(),
    LedgerEntry.find(scopeQuery(auth)).sort({ date: 1 }).lean(),
  ]);

  const portfolio = calculatePortfolioSummary(
    openTrades,
    closedTrades,
    settings.startingBalance,
    ledgerEntries,
    settings
  );
  const performance = calculatePerformance(
    closedTrades,
    settings.startingBalance,
    ledgerEntries
  );
  const todayRealizedPnl = getTodayRealizedPnl(closedTrades);
  const warnings = generatePortfolioWarnings({
    portfolio,
    performance,
    settings,
    todayRealizedPnl,
  });

  return {
    ...portfolio,
    currentDrawdownPct: performance.currentDrawdownPct,
    maxDrawdownPct: performance.maxDrawdownPct,
    todayRealizedPnl,
    currentLosingStreak: performance.currentLosingStreak,
    warnings,
  };
}

export async function getPortfolioPerformance(auth) {
  const [settings, closedTrades, ledgerEntries] = await Promise.all([
    getSettings(auth),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED }))
      .sort({ closedAt: 1 })
      .lean(),
    LedgerEntry.find(scopeQuery(auth)).sort({ date: 1 }).lean(),
  ]);

  return calculatePerformance(
    closedTrades,
    settings.startingBalance,
    ledgerEntries
  );
}
