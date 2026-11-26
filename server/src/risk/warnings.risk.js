import { EPS } from './constants.js';

/**
 * Generate non-scoring risk warnings for a trade or portfolio state.
 */
export function generateTradeWarnings({
  symbol,
  leverage,
  metrics,
  settings,
  availableMargin,
  balance,
  todayRealizedPnl = 0,
  consecutiveLosses = 0,
  openTrades = [],
}) {
  const warnings = [];

  if (leverage > settings.maxLeverage + EPS) {
    warnings.push(
      `Leverage (${leverage}x) exceeds your configured maximum (${settings.maxLeverage}x).`
    );
  }

  if (metrics.margin > availableMargin + EPS) {
    warnings.push(
      `Required margin ($${metrics.margin.toFixed(2)}) exceeds available margin ($${availableMargin.toFixed(2)}).`
    );
  }

  const dailyLoss = todayRealizedPnl < 0 ? Math.abs(todayRealizedPnl) : 0;
  const maxDailyLossAmount = (balance * settings.maxDailyLossPct) / 100;
  if (balance > 0 && dailyLoss > maxDailyLossAmount + EPS) {
    warnings.push(
      `Today's realized loss ($${dailyLoss.toFixed(2)}) exceeds your daily loss limit (${settings.maxDailyLossPct}% / $${maxDailyLossAmount.toFixed(2)}).`
    );
  }

  if (consecutiveLosses >= 3) {
    warnings.push(
      `You are on a ${consecutiveLosses}-trade losing streak. Consider reducing size or pausing.`
    );
  }

  // Concentration check when 2 or more trades are open (including candidate trade)
  const combinedTrades = [
    ...openTrades.map((t) => ({
      symbol: t.symbol,
      notional: t.metrics?.notional ?? 0,
    })),
    ...(symbol ? [{ symbol, notional: metrics.notional }] : []),
  ];

  if (combinedTrades.length >= 2) {
    const totalNotional = combinedTrades.reduce((sum, t) => sum + t.notional, 0);
    if (totalNotional > 0) {
      const bySymbol = new Map();
      for (const item of combinedTrades) {
        bySymbol.set(item.symbol, (bySymbol.get(item.symbol) || 0) + item.notional);
      }
      for (const [sym, notional] of bySymbol.entries()) {
        const pct = (notional / totalNotional) * 100;
        if (pct > 50 + EPS) {
          warnings.push(
            `High symbol concentration: ${sym} represents ${pct.toFixed(1)}% of open exposure.`
          );
        }
      }
    }
  }

  return warnings;
}

/**
 * Generate portfolio-level warnings for open positions and account state.
 */
export function generatePortfolioWarnings({
  portfolio,
  performance,
  settings,
  todayRealizedPnl = 0,
}) {
  const warnings = [];
  const { balance, availableMargin, openRiskPct, concentration, openCount } = portfolio;

  if (availableMargin < -EPS) {
    warnings.push(
      `Margin used exceeds account balance (available margin: $${availableMargin.toFixed(2)}).`
    );
  }

  if (openRiskPct > settings.maxOpenRiskPct + EPS) {
    warnings.push(
      `Total open risk (${openRiskPct.toFixed(2)}%) exceeds limit (${settings.maxOpenRiskPct}%).`
    );
  }

  if (performance.currentDrawdownPct > settings.maxDrawdownPct + EPS) {
    warnings.push(
      `Current drawdown (${performance.currentDrawdownPct.toFixed(2)}%) exceeds limit (${settings.maxDrawdownPct}%).`
    );
  }

  const dailyLoss = todayRealizedPnl < 0 ? Math.abs(todayRealizedPnl) : 0;
  const maxDailyLossAmount = (balance * settings.maxDailyLossPct) / 100;
  if (balance > 0 && dailyLoss > maxDailyLossAmount + EPS) {
    warnings.push(
      `Today's realized loss ($${dailyLoss.toFixed(2)}) exceeds your daily loss limit (${settings.maxDailyLossPct}%).`
    );
  }

  if (performance.currentLosingStreak >= 3) {
    warnings.push(
      `Current losing streak is ${performance.currentLosingStreak} trades.`
    );
  }

  if (openCount >= 2) {
    for (const item of concentration) {
      if (item.pct > 50 + EPS) {
        warnings.push(
          `High symbol concentration: ${item.symbol} represents ${item.pct.toFixed(1)}% of open exposure.`
        );
      }
    }
  }

  return warnings;
}
