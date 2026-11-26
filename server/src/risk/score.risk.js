import { EPS, RISK_BANDS } from './constants.js';

export function getRiskBand(score) {
  if (score <= 25) return RISK_BANDS.LOW;
  if (score <= 50) return RISK_BANDS.MEDIUM;
  if (score <= 75) return RISK_BANDS.HIGH;
  return RISK_BANDS.CRITICAL;
}

/**
 * Compute deterministic risk score (0-100), risk band, and factor breakdown.
 * Uses netRiskReward when available and effectiveRiskPct when drawdown sizing is active.
 */
export function calculateRiskScore({
  metrics,
  leverage,
  settings,
  projectedOpenRiskPct,
  currentDrawdownPct = 0,
  effectiveRiskPct = null,
}) {
  const breakdown = [];
  const limit =
    effectiveRiskPct !== null && effectiveRiskPct !== undefined
      ? effectiveRiskPct
      : settings.riskPerTradePct;

  // 1. Risk per trade
  let riskPts = 0;
  let riskReason = `Amount at risk (${metrics.amountAtRiskPct.toFixed(2)}%) is within limit (${limit}%)`;
  if (metrics.amountAtRiskPct > 2 * limit + EPS) {
    riskPts = 25;
    riskReason = `Amount at risk (${metrics.amountAtRiskPct.toFixed(2)}%) exceeds 2x limit (${(2 * limit).toFixed(2)}%)`;
  } else if (metrics.amountAtRiskPct > limit + EPS) {
    riskPts = 15;
    riskReason = `Amount at risk (${metrics.amountAtRiskPct.toFixed(2)}%) exceeds limit (${limit}%)`;
  }
  breakdown.push({ factor: 'Risk per trade', points: riskPts, reason: riskReason });

  // 2. Leverage
  let levPts = 0;
  let levReason = `Leverage (${leverage}x) is <= 5x`;
  if (leverage > 20 + EPS) {
    levPts = 20;
    levReason = `Leverage (${leverage}x) exceeds 20x`;
  } else if (leverage > 10 + EPS) {
    levPts = 15;
    levReason = `Leverage (${leverage}x) is between 10x and 20x`;
  } else if (leverage > 5 + EPS) {
    levPts = 10;
    levReason = `Leverage (${leverage}x) is between 5x and 10x`;
  }
  breakdown.push({ factor: 'Leverage', points: levPts, reason: levReason });

  // 3. Stop-loss
  let stopPts = 0;
  let stopReason = 'Stop-loss is set inside liquidation boundary';
  if (!metrics.hasStop) {
    stopPts = 25;
    stopReason = 'No stop-loss set (entire margin is at risk)';
  } else if (metrics.stopBeyondLiquidation) {
    stopPts = 25;
    stopReason = 'Stop-loss is beyond estimated liquidation price';
  }
  breakdown.push({ factor: 'Stop-loss', points: stopPts, reason: stopReason });

  // 4. Risk:reward (uses netRiskReward)
  const rrToScore =
    metrics.netRiskReward !== undefined && metrics.netRiskReward !== null
      ? metrics.netRiskReward
      : metrics.riskReward;

  let rrPts = 0;
  let rrReason = 'Net risk:reward meets minimum target';
  if (!metrics.hasTarget) {
    rrPts = 10;
    rrReason = 'No target price set';
  } else if (!metrics.hasStop) {
    rrPts = 0;
    rrReason = 'Target is set (R:R not available without stop-loss)';
  } else if (rrToScore < 1 - EPS) {
    rrPts = 15;
    rrReason = `Net risk:reward (${rrToScore.toFixed(2)}) is below 1.0`;
  } else if (rrToScore < settings.minRiskReward - EPS) {
    rrPts = 10;
    rrReason = `Net risk:reward (${rrToScore.toFixed(2)}) is below minimum (${settings.minRiskReward})`;
  } else {
    rrReason = `Net risk:reward (${rrToScore.toFixed(2)}) meets minimum (${settings.minRiskReward})`;
  }
  breakdown.push({ factor: 'Risk:reward', points: rrPts, reason: rrReason });

  // 5. Portfolio
  let portfolioPts = 0;
  const portfolioReasons = [];
  if (projectedOpenRiskPct > settings.maxOpenRiskPct + EPS) {
    portfolioPts += 10;
    portfolioReasons.push(
      `Projected open risk (${projectedOpenRiskPct.toFixed(2)}%) exceeds max (${settings.maxOpenRiskPct}%)`
    );
  }
  if (currentDrawdownPct > settings.maxDrawdownPct + EPS) {
    portfolioPts += 5;
    portfolioReasons.push(
      `Current drawdown (${currentDrawdownPct.toFixed(2)}%) exceeds max (${settings.maxDrawdownPct}%)`
    );
  }
  breakdown.push({
    factor: 'Portfolio',
    points: portfolioPts,
    reason:
      portfolioReasons.length > 0
        ? portfolioReasons.join('; ')
        : 'Open risk and drawdown are within limits',
  });

  let score = riskPts + levPts + stopPts + rrPts + portfolioPts;
  if (!metrics.hasStop || metrics.stopBeyondLiquidation) {
    score = Math.max(score, 51);
  }
  score = Math.min(score, 100);

  return {
    score,
    band: getRiskBand(score),
    breakdown,
  };
}
