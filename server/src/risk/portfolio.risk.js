import { TRADE_SIDES } from './constants.js';
import { computeBalance } from './trade.risk.js';
import { calculateRemainingOpenRisk, evaluateMarkState } from './lifecycle.risk.js';

/**
 * Compute portfolio exposure, margin, open risk, unrealized PnL, and symbol concentration.
 */
export function calculatePortfolioSummary(
  openTrades = [],
  closedTrades = [],
  startingBalance = 10000,
  ledgerEntries = [],
  settings = {}
) {
  const balance = computeBalance(startingBalance, closedTrades, ledgerEntries);

  let totalNotional = 0;
  let marginUsed = 0;
  let openRiskAmount = 0;
  let longExposure = 0;
  let shortExposure = 0;
  let unrealizedPnl = 0;
  const symbolMap = new Map();

  for (const trade of openTrades) {
    const remainingQty = trade.remainingQuantity ?? trade.quantity;
    const hasPositionFields =
      Number.isFinite(remainingQty) && Number.isFinite(trade.entry);

    const notional = hasPositionFields
      ? remainingQty * trade.entry
      : trade.metrics?.notional ?? 0;
    const margin =
      hasPositionFields && trade.leverage > 0
        ? notional / trade.leverage
        : trade.metrics?.margin ?? 0;
    const risk = hasPositionFields
      ? calculateRemainingOpenRisk(trade, settings)
      : trade.metrics?.amountAtRisk ?? 0;
    const markState = hasPositionFields
      ? evaluateMarkState(trade)
      : { unrealizedPnl: 0 };

    totalNotional += notional;
    marginUsed += margin;
    openRiskAmount += risk;
    unrealizedPnl += markState.unrealizedPnl;

    if (trade.side === TRADE_SIDES.LONG) {
      longExposure += notional;
    } else if (trade.side === TRADE_SIDES.SHORT) {
      shortExposure += notional;
    }

    if (trade.symbol) {
      symbolMap.set(trade.symbol, (symbolMap.get(trade.symbol) || 0) + notional);
    }
  }

  const equity = balance + unrealizedPnl;
  const availableMargin = balance - marginUsed;
  const openRiskPct = balance > 0 ? (openRiskAmount / balance) * 100 : 0;
  const netExposure = longExposure - shortExposure;
  const effectiveLeverage = balance > 0 ? totalNotional / balance : 0;

  const concentration = Array.from(symbolMap.entries())
    .map(([symbol, notional]) => ({
      symbol,
      notional,
      pct: totalNotional > 0 ? (notional / totalNotional) * 100 : 0,
    }))
    .sort((a, b) => b.notional - a.notional);

  const leverageMap = new Map();
  for (const trade of openTrades) {
    const lev = trade.leverage || 1;
    const rem = trade.remainingQuantity ?? trade.quantity;
    const n =
      Number.isFinite(rem) && Number.isFinite(trade.entry)
        ? rem * trade.entry
        : trade.metrics?.notional ?? 0;
    leverageMap.set(lev, (leverageMap.get(lev) || 0) + n);
  }
  const leverageConcentration = Array.from(leverageMap.entries())
    .map(([leverage, notional]) => ({
      leverage,
      notional,
      pct: totalNotional > 0 ? (notional / totalNotional) * 100 : 0,
    }))
    .sort((a, b) => b.leverage - a.leverage);

  return {
    balance,
    unrealizedPnl,
    equity,
    openCount: openTrades.length,
    totalNotional,
    marginUsed,
    availableMargin,
    openRiskAmount,
    openRiskPct,
    longExposure,
    shortExposure,
    netExposure,
    effectiveLeverage,
    concentration,
    leverageConcentration,
  };
}
