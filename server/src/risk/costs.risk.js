import { TRADE_SIDES } from './constants.js';

/**
 * Floor quantity to the nearest multiple of qtyStep.
 */
export function roundDownToStep(quantity, qtyStep) {
  if (!qtyStep || qtyStep <= 0) return quantity;
  return Math.floor((quantity + 1e-12) / qtyStep) * qtyStep;
}

/**
 * Compute per-unit trading costs (taker fees, slippage, funding) and break-even price.
 * Expected funding income never reduces risk (clamped at >= 0).
 */
export function calculateTradeCosts({
  side,
  entry,
  stopLoss = null,
  target = null,
  takerFeePct = 0,
  slippagePct = 0,
  fundingRatePct = 0,
  fundingIntervals = 0,
}) {
  const f = takerFeePct / 100;
  const s = slippagePct / 100;
  const dir = side === TRADE_SIDES.LONG ? 1 : -1;

  const fundingPerUnit = Math.max(
    0,
    dir * entry * (fundingRatePct / 100) * fundingIntervals
  );

  const entryFeePerUnit = entry * f;
  const stopFeePerUnit = stopLoss != null ? stopLoss * f : 0;
  const stopSlippagePerUnit = stopLoss != null ? stopLoss * s : 0;

  const lossPerUnit =
    stopLoss != null
      ? Math.abs(entry - stopLoss) +
        entryFeePerUnit +
        stopFeePerUnit +
        stopSlippagePerUnit +
        fundingPerUnit
      : null;

  const targetFeePerUnit = target != null ? target * f : 0;
  const netRewardPerUnit =
    target != null
      ? Math.abs(target - entry) - entryFeePerUnit - targetFeePerUnit - fundingPerUnit
      : null;

  const breakEven =
    side === TRADE_SIDES.LONG
      ? (entry * (1 + f) + fundingPerUnit) / (1 - f)
      : (entry * (1 - f) - fundingPerUnit) / (1 + f);

  return {
    feeRate: f,
    slippageRate: s,
    fundingRatePct,
    fundingIntervals,
    fundingPerUnit,
    entryFeePerUnit,
    stopFeePerUnit,
    stopSlippagePerUnit,
    lossPerUnit,
    targetFeePerUnit,
    netRewardPerUnit,
    breakEven,
  };
}
