import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import SymbolProfile from '../models/SymbolProfile.js';
import { TRADE_STATUSES } from '../risk/constants.js';
import { DEFAULT_SHOCKS, runStressTest } from '../risk/stress.risk.js';
import { runMonteCarlo } from '../risk/montecarlo.risk.js';
import {
  calculateCorrelationMatrix,
  calculateDrawdownRecovery,
  calculateKelly,
  calculateRiskOfRuin,
} from '../risk/advanced.risk.js';
import { calculatePerformance } from '../risk/performance.risk.js';
import { calculateEffectiveRiskPct } from '../risk/sizing.risk.js';
import { computeBalance } from '../risk/trade.risk.js';
import { scopeQuery } from '../utils/scopeQuery.js';
import { getSettings } from './settings.service.js';
import { getGuardrailStatus } from './guardrail.service.js';

export async function executeStressTest(
  auth,
  { mode = 'STOPS_WORK', customShockPct = null }
) {
  const [settings, openTrades, closedTrades, ledgerEntries, profiles] =
    await Promise.all([
      getSettings(auth),
      Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.OPEN })).lean(),
      Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED })).lean(),
      LedgerEntry.find(scopeQuery(auth)).lean(),
      SymbolProfile.find(scopeQuery(auth)).lean(),
    ]);

  const balance = computeBalance(
    settings.startingBalance,
    closedTrades,
    ledgerEntries
  );
  const symbolProfilesMap = new Map(profiles.map((p) => [p.symbol, p]));
  const shocks =
    customShockPct !== null && customShockPct !== undefined
      ? [...DEFAULT_SHOCKS, customShockPct]
      : DEFAULT_SHOCKS;

  return runStressTest({
    openTrades,
    balance,
    settings,
    symbolProfilesMap,
    shocks,
    mode,
  });
}

export async function executeMonteCarlo(
  auth,
  { runs = 10000, tradesPerRun = 100, seed = 42 }
) {
  const [settings, closedTrades, ledgerEntries] = await Promise.all([
    getSettings(auth),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED }))
      .sort({ closedAt: 1 })
      .lean(),
    LedgerEntry.find(scopeQuery(auth)).lean(),
  ]);

  const balance = computeBalance(
    settings.startingBalance,
    closedTrades,
    ledgerEntries
  );
  const rMultiples = closedTrades.map((t) => t.rMultiple);

  return runMonteCarlo({
    rMultiples,
    startingEquity: Math.max(0, balance),
    riskFraction: settings.riskPerTradePct / 100,
    runs,
    tradesPerRun,
    seed,
  });
}

export async function getAdvancedRiskMetrics(
  auth,
  { ruinThresholdPct = 50, customKellyFraction = 0.25 } = {}
) {
  const [settings, closedTrades, ledgerEntries, guardrails] = await Promise.all([
    getSettings(auth),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED }))
      .sort({ closedAt: 1 })
      .lean(),
    LedgerEntry.find(scopeQuery(auth)).sort({ date: 1 }).lean(),
    getGuardrailStatus(auth),
  ]);

  const performance = calculatePerformance(
    closedTrades,
    settings.startingBalance,
    ledgerEntries
  );
  const sizing = calculateEffectiveRiskPct(
    settings.riskPerTradePct,
    performance.currentDrawdownPct,
    settings.drawdownTiers
  );

  const wins = closedTrades.filter((t) => (t.realizedPnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.realizedPnl ?? 0) < 0);
  const avgWin =
    wins.length > 0
      ? wins.reduce((s, t) => s + t.realizedPnl, 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((s, t) => s + t.realizedPnl, 0) / losses.length)
      : 0;

  const riskOfRuin = calculateRiskOfRuin({
    winRatePct: performance.winRate,
    avgWin,
    avgLoss,
    riskPerTradePct: sizing.effectiveRiskPct,
    ruinThresholdPct,
  });

  const kelly = calculateKelly({
    winRatePct: performance.winRate,
    avgWin,
    avgLoss,
    customFraction: customKellyFraction,
  });

  const drawdownRecovery = calculateDrawdownRecovery(performance);

  const riskBudget = {
    effectiveRiskPerTradePct: sizing.effectiveRiskPct,
    dailyLossUsedPct: guardrails.limits.dailyLossPct,
    dailyLossLimitPct: guardrails.limits.maxDailyLossPct,
    dailyRemainingPct: Math.max(
      0,
      guardrails.limits.maxDailyLossPct - guardrails.limits.dailyLossPct
    ),
    weeklyLossUsedPct: guardrails.limits.weeklyLossPct,
    weeklyLossLimitPct: guardrails.limits.maxWeeklyLossPct,
    weeklyRemainingPct: Math.max(
      0,
      guardrails.limits.maxWeeklyLossPct - guardrails.limits.weeklyLossPct
    ),
    openRiskUsedPct: guardrails.limits.openRiskPct,
    openRiskLimitPct: guardrails.limits.maxOpenRiskPct,
    openRiskRemainingPct: Math.max(
      0,
      guardrails.limits.maxOpenRiskPct - guardrails.limits.openRiskPct
    ),
    guardrailStatus: guardrails.status,
  };

  return {
    riskOfRuin,
    kelly,
    drawdownRecovery,
    riskBudget,
  };
}

export function computeCorrelation({ series = {} }) {
  return calculateCorrelationMatrix(series);
}
