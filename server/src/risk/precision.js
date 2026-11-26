/**
 * Financial precision helpers.
 * Strategy: Keep full 64-bit IEEE-754 float precision for intermediate math
 * (to avoid compounding rounding errors) and use EPS = 1e-9 for threshold
 * comparisons, rounding only at settlement or display boundaries.
 */
export function roundTo(value, decimals = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
}

export function roundMoney(value) {
  return roundTo(value, 2);
}

export function roundQty(value) {
  return roundTo(value, 8);
}
