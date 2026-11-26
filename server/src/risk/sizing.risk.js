import { DEFAULT_DRAWDOWN_TIERS, EPS } from './constants.js';

/**
 * Compute drawdown-adjusted effective risk % from settings tiers.
 */
export function calculateEffectiveRiskPct(
  baseRiskPct,
  currentDrawdownPct = 0,
  tiers = DEFAULT_DRAWDOWN_TIERS
) {
  const sortedTiers = [...(tiers?.length ? tiers : DEFAULT_DRAWDOWN_TIERS)].sort(
    (a, b) => a.minDrawdownPct - b.minDrawdownPct
  );

  let matched = sortedTiers[0];
  for (const tier of sortedTiers) {
    if (currentDrawdownPct >= tier.minDrawdownPct - EPS) {
      matched = tier;
    }
  }

  const multiplier = matched?.multiplier ?? 1;
  const effectiveRiskPct = baseRiskPct * multiplier;

  const reason =
    multiplier < 1
      ? `Drawdown is ${currentDrawdownPct.toFixed(2)}% (tier >= ${matched.minDrawdownPct}%): risk scaled by ${multiplier}x to ${effectiveRiskPct.toFixed(2)}%`
      : `Drawdown is ${currentDrawdownPct.toFixed(2)}% (< ${sortedTiers[1]?.minDrawdownPct ?? 5}%): full ${effectiveRiskPct.toFixed(2)}% risk allowed`;

  return {
    baseRiskPct,
    currentDrawdownPct,
    multiplier,
    effectiveRiskPct,
    reason,
  };
}
