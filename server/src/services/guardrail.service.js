import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import SymbolProfile from '../models/SymbolProfile.js';
import { TRADE_STATUSES } from '../risk/constants.js';
import { calculatePortfolioSummary } from '../risk/portfolio.risk.js';
import { evaluateGuardrails } from '../risk/guardrails.risk.js';
import { getKolkataDayBounds } from '../utils/date.js';
import { scopeQuery } from '../utils/scopeQuery.js';
import { getSettings } from './settings.service.js';

export async function getGuardrailStatus(auth) {
  const now = new Date();
  const { start: dayStart, end: dayEnd } = getKolkataDayBounds(now);

  const [settings, openTrades, closedTrades, ledgerEntries, profiles, openedTodayCount] =
    await Promise.all([
      getSettings(auth),
      Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.OPEN })).lean(),
      Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED }))
        .sort({ closedAt: 1 })
        .lean(),
      LedgerEntry.find(scopeQuery(auth)).sort({ date: 1 }).lean(),
      SymbolProfile.find(scopeQuery(auth)).lean(),
      Trade.countDocuments(
        scopeQuery(auth, {
          openedAt: { $gte: dayStart, $lt: dayEnd },
          status: { $ne: TRADE_STATUSES.CANCELLED },
        })
      ),
    ]);

  const portfolio = calculatePortfolioSummary(
    openTrades,
    closedTrades,
    settings.startingBalance,
    ledgerEntries,
    settings
  );

  const symbolProfilesMap = new Map(profiles.map((p) => [p.symbol, p]));

  return evaluateGuardrails({
    settings,
    openTrades,
    closedTrades,
    allTradesOpenedTodayCount: openedTodayCount,
    ledgerEntries,
    symbolProfilesMap,
    balance: portfolio.balance,
    openRiskAmount: portfolio.openRiskAmount,
    now,
  });
}
