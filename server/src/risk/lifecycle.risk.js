import ApiError from '../utils/ApiError.js';
import { EPS, TRADE_SIDES } from './constants.js';

const STALE_MARK_MS = 4 * 60 * 60 * 1000;

/**
 * Compute PnL for a partial or full exit, including proportional entry fee.
 */
export function calculateExitPnl({
  side,
  entry,
  initialQuantity,
  entryFee = 0,
  exitQuantity,
  exitPrice,
  exitFee = 0,
  fundingPaid = 0,
}) {
  if (!Number.isFinite(exitQuantity) || exitQuantity <= 0) {
    throw new ApiError(400, 'Exit quantity must be greater than 0');
  }
  if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
    throw new ApiError(400, 'Exit price must be greater than 0');
  }
  if (!Number.isFinite(exitFee) || exitFee < 0) {
    throw new ApiError(400, 'Exit fee must be 0 or greater');
  }
  if (!Number.isFinite(fundingPaid)) {
    throw new ApiError(400, 'Funding paid must be a finite number');
  }

  const dir = side === TRADE_SIDES.LONG ? 1 : -1;
  const allocatedEntryFee =
    initialQuantity > 0 ? (entryFee * exitQuantity) / initialQuantity : 0;

  return (
    dir * (exitPrice - entry) * exitQuantity -
    exitFee -
    allocatedEntryFee -
    fundingPaid
  );
}

/**
 * Validate a stop-loss move against current mark price and widen-reason rule.
 */
export function validateStopMove({
  side,
  oldStop,
  newStop,
  markPrice,
  entry,
  reason = '',
}) {
  if (!Number.isFinite(newStop) || newStop <= 0) {
    throw new ApiError(400, 'New stop-loss must be a finite number greater than 0');
  }

  const referenceMark =
    markPrice !== null && markPrice !== undefined ? markPrice : entry;

  if (side === TRADE_SIDES.LONG && newStop >= referenceMark) {
    throw new ApiError(
      400,
      `For a LONG trade, stop-loss ($${newStop}) must be below current mark price ($${referenceMark})`
    );
  }
  if (side === TRADE_SIDES.SHORT && newStop <= referenceMark) {
    throw new ApiError(
      400,
      `For a SHORT trade, stop-loss ($${newStop}) must be above current mark price ($${referenceMark})`
    );
  }

  const isWidening =
    oldStop !== null &&
    oldStop !== undefined &&
    (side === TRADE_SIDES.LONG ? newStop < oldStop - EPS : newStop > oldStop + EPS);

  if (isWidening && !String(reason || '').trim()) {
    throw new ApiError(400, 'A reason is required when widening a stop-loss');
  }

  return { isWidening };
}

/**
 * Compute mark-to-market status, unrealized PnL, and distance to liquidation for an open trade.
 */
export function evaluateMarkState(trade, now = new Date()) {
  const remainingQty = trade.remainingQuantity ?? trade.quantity ?? 0;
  const hasManualMark =
    trade.markPrice !== null && trade.markPrice !== undefined;
  const effectiveMark = hasManualMark ? trade.markPrice : trade.entry;
  const markLabel = hasManualMark ? 'manual' : 'entry';

  let isMarkStale = false;
  if (hasManualMark && trade.markUpdatedAt) {
    const ageMs = now.getTime() - new Date(trade.markUpdatedAt).getTime();
    isMarkStale = ageMs > STALE_MARK_MS;
  }

  const dir = trade.side === TRADE_SIDES.LONG ? 1 : -1;
  const unrealizedPnl = dir * (effectiveMark - trade.entry) * remainingQty;

  const liquidation = trade.metrics?.liquidation ?? null;
  const distanceToLiquidationPct =
    liquidation !== null && effectiveMark > 0
      ? (Math.abs(effectiveMark - liquidation) / effectiveMark) * 100
      : null;

  return {
    effectiveMark,
    markLabel,
    isMarkStale,
    unrealizedPnl,
    distanceToLiquidationPct,
  };
}

/**
 * Compute current open risk on remaining quantity from entry to current stop,
 * including exit costs, clamped at >= 0.
 */
export function calculateRemainingOpenRisk(trade, settings = {}) {
  const remainingQty = trade.remainingQuantity ?? trade.quantity ?? 0;
  const initialQty = trade.initialQuantity ?? trade.quantity ?? remainingQty;
  if (remainingQty <= EPS) return 0;

  const f = (settings.takerFeePct ?? 0) / 100;
  const s = (settings.slippagePct ?? 0) / 100;
  const allocatedEntryFee =
    initialQty > 0
      ? ((trade.metrics?.entryFee ?? 0) * remainingQty) / initialQty
      : 0;

  const hasStop = trade.stopLoss !== null && trade.stopLoss !== undefined;
  const stopBeyondLiq = Boolean(trade.metrics?.stopBeyondLiquidation);

  if (!hasStop || stopBeyondLiq) {
    const remainingMargin = (remainingQty * trade.entry) / trade.leverage;
    return Math.max(0, remainingMargin + allocatedEntryFee);
  }

  const dir = trade.side === TRADE_SIDES.LONG ? 1 : -1;
  const priceLoss = dir * (trade.entry - trade.stopLoss) * remainingQty;
  const exitCosts = remainingQty * trade.stopLoss * (f + s) + allocatedEntryFee;

  return Math.max(0, priceLoss + exitCosts);
}
