import { RISK_BANDS } from '../risk/constants.js';
import { enforceVerdictFloor } from './response.schema.js';

export function generateTradeFallback(payload) {
  const { symbol, side, riskScore, riskBand, scoreBreakdown = [], warnings = [] } = payload;

  const weaknesses = scoreBreakdown
    .filter((item) => item.points > 0)
    .map((item) => `${item.factor} (+${item.points} pts): ${item.reason}`);

  for (const w of warnings) {
    weaknesses.push(w);
  }

  const suggestions = [];
  for (const item of scoreBreakdown) {
    if (item.points === 0) continue;
    if (item.factor === 'Stop-loss') {
      suggestions.push('Set a stop-loss inside the estimated liquidation price.');
    } else if (item.factor === 'Risk per trade') {
      suggestions.push('Reduce position size so amount at risk stays within your risk-per-trade limit.');
    } else if (item.factor === 'Leverage') {
      suggestions.push('Lower leverage to reduce liquidation proximity and margin risk.');
    } else if (item.factor === 'Risk:reward') {
      suggestions.push('Set a target price that meets or exceeds your minimum risk-to-reward ratio.');
    } else if (item.factor === 'Portfolio') {
      suggestions.push('Reduce open exposure or wait until drawdown recovers before adding risk.');
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('Risk parameters are within your configured limits. Follow your trade plan.');
  }

  let verdict = 'ACCEPTABLE';
  if (riskBand === RISK_BANDS.CRITICAL) verdict = 'TOO_RISKY';
  else if (riskBand === RISK_BANDS.HIGH) verdict = 'NEEDS_CHANGES';
  else if (riskBand === RISK_BANDS.MEDIUM) verdict = 'NEEDS_CHANGES';

  const summary = `${symbol} ${side} has a risk score of ${riskScore}/100 (${riskBand}). ${
    weaknesses.length > 0
      ? `Key risk factors were flagged (${weaknesses.length} item${weaknesses.length > 1 ? 's' : ''}).`
      : 'All scored risk factors are within your configured limits.'
  }`;

  return enforceVerdictFloor(
    {
      summary,
      weaknesses,
      suggestions,
      verdict,
    },
    riskBand
  );
}

export function generatePortfolioFallback(payload) {
  const { summary: portfolio, performance, warnings = [] } = payload;
  const weaknesses = [...warnings];
  const suggestions = [];

  if (portfolio.openCount === 0 && performance.totalTrades === 0) {
    return {
      summary: `Your account balance is $${portfolio.balance.toFixed(2)} with no open positions or closed trades yet.`,
      weaknesses: [],
      suggestions: ['Use the New Trade calculator to size your first position within your risk limits.'],
      verdict: 'ACCEPTABLE',
    };
  }

  if (portfolio.openRiskPct > 5) {
    suggestions.push('Reduce total open risk by trimming or closing high-risk positions.');
  }
  if (performance.currentDrawdownPct > 0) {
    suggestions.push('Trade smaller size while in drawdown to protect remaining capital.');
  }
  if (portfolio.concentration?.some((c) => c.pct > 50) && portfolio.openCount >= 2) {
    suggestions.push('Diversify open exposure so a single symbol does not dominate your account.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Keep monitoring open risk, effective leverage, and daily loss limits.');
  }

  const verdict =
    warnings.length >= 2
      ? 'TOO_RISKY'
      : warnings.length === 1
      ? 'NEEDS_CHANGES'
      : 'ACCEPTABLE';

  const summary = `Account balance is $${portfolio.balance.toFixed(
    2
  )} with ${portfolio.openCount} open position(s), ${portfolio.openRiskPct.toFixed(
    2
  )}% open risk, and ${portfolio.effectiveLeverage.toFixed(2)}x effective leverage.`;

  return {
    summary,
    weaknesses,
    suggestions,
    verdict,
  };
}

export function generateWeeklyFallback(payload) {
  const { performance, flagCounts = {} } = payload;
  const weaknesses = [];
  const suggestions = [];

  if (flagCounts.revengeTrade > 0) {
    weaknesses.push(`Revenge trading detected (${flagCounts.revengeTrade} trade(s)).`);
    suggestions.push('Wait at least 30 minutes after a loss and do not increase size.');
  }
  if (flagCounts.overtrading > 0) {
    weaknesses.push(`Overtrading detected (${flagCounts.overtrading} trade(s)).`);
    suggestions.push('Respect your maximum daily trade count limit.');
  }
  if (flagCounts.widenedStop > 0) {
    weaknesses.push(`Stop-loss widened (${flagCounts.widenedStop} trade(s)).`);
    suggestions.push('Never widen a stop-loss after entry; accept the planned invalidation.');
  }
  if (flagCounts.overrideUsed > 0) {
    weaknesses.push(`Guardrail overrides used (${flagCounts.overrideUsed} trade(s)).`);
    suggestions.push('Avoid overriding circuit breakers during active risk limits.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Maintain disciplined execution and continue logging trade journals.');
  }

  const totalFlags =
    (flagCounts.revengeTrade || 0) +
    (flagCounts.overtrading || 0) +
    (flagCounts.widenedStop || 0) +
    (flagCounts.overrideUsed || 0);

  const verdict =
    totalFlags >= 3 ? 'TOO_RISKY' : totalFlags >= 1 ? 'NEEDS_CHANGES' : 'ACCEPTABLE';

  const summary = `Closed ${performance.totalTrades} trade(s) with ${performance.winRate.toFixed(
    1
  )}% win rate, ${performance.averageR.toFixed(2)}R average, and ${totalFlags} behavioural flag(s).`;

  return {
    summary,
    weaknesses,
    suggestions,
    verdict,
  };
}
