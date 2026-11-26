import ApiError from '../utils/ApiError.js';
import { EPS, MAX_LEVERAGE_HARD_CAP, MIN_LEVERAGE, TRADE_SIDES } from './constants.js';
import { calculateTradeCosts, roundDownToStep } from './costs.risk.js';

function isPositiveFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Compute account balance from starting balance, closed trades, and ledger cash flows.
 */
export function computeBalance(
  startingBalance,
  closedTrades = [],
  ledgerEntries = []
) {
  const realizedSum = closedTrades.reduce(
    (sum, trade) => sum + (Number.isFinite(trade.realizedPnl) ? trade.realizedPnl : 0),
    0
  );
  const cashFlowSum = ledgerEntries.reduce((sum, entry) => {
    if (!Number.isFinite(entry.amount)) return sum;
    return entry.type === 'DEPOSIT' ? sum + entry.amount : sum - entry.amount;
  }, 0);
  return startingBalance + realizedSum + cashFlowSum;
}

/**
 * Validate trade inputs and compute position sizing, liquidation, costs, and risk metrics.
 */
export function calculateTradeMetrics(
  input,
  balance,
  settings,
  symbolProfile = null,
  effectiveRiskPct = null
) {
  if (!Number.isFinite(balance) || balance <= 0) {
    throw new ApiError(400, 'Account balance must be greater than 0 to open a trade');
  }

  const {
    side,
    entry,
    stopLoss,
    target,
    leverage,
    quantity: inputQuantity,
    fundingRatePct,
    fundingIntervals = 0,
  } = input;

  if (side !== TRADE_SIDES.LONG && side !== TRADE_SIDES.SHORT) {
    throw new ApiError(400, 'Trade side must be LONG or SHORT');
  }

  if (!isPositiveFinite(entry)) {
    throw new ApiError(400, 'Entry price must be a finite number greater than 0');
  }

  if (
    typeof leverage !== 'number' ||
    !Number.isFinite(leverage) ||
    leverage < MIN_LEVERAGE ||
    leverage > MAX_LEVERAGE_HARD_CAP
  ) {
    throw new ApiError(
      400,
      `Leverage must be a finite number between ${MIN_LEVERAGE} and ${MAX_LEVERAGE_HARD_CAP}`
    );
  }

  if (symbolProfile && leverage > symbolProfile.maxLeverage + EPS) {
    throw new ApiError(
      400,
      `Leverage (${leverage}x) exceeds ${symbolProfile.symbol} profile limit (${symbolProfile.maxLeverage}x)`
    );
  }

  const hasStop = stopLoss !== null && stopLoss !== undefined;
  const hasTarget = target !== null && target !== undefined;
  const hasQuantity = inputQuantity !== null && inputQuantity !== undefined;

  if (hasStop && !isPositiveFinite(stopLoss)) {
    throw new ApiError(400, 'Stop-loss must be a finite number greater than 0');
  }

  if (hasTarget && !isPositiveFinite(target)) {
    throw new ApiError(400, 'Target price must be a finite number greater than 0');
  }

  if (hasQuantity && !isPositiveFinite(inputQuantity)) {
    throw new ApiError(400, 'Quantity must be a finite number greater than 0');
  }

  if (!hasStop && !hasQuantity) {
    throw new ApiError(400, 'Quantity is required when stop-loss is not provided');
  }

  if (side === TRADE_SIDES.LONG) {
    if (hasStop && stopLoss >= entry) {
      throw new ApiError(400, 'For a LONG trade, stop-loss must be below entry price');
    }
    if (hasTarget && target <= entry) {
      throw new ApiError(400, 'For a LONG trade, target must be above entry price');
    }
  } else {
    if (hasStop && stopLoss <= entry) {
      throw new ApiError(400, 'For a SHORT trade, stop-loss must be above entry price');
    }
    if (hasTarget && target >= entry) {
      throw new ApiError(400, 'For a SHORT trade, target must be below entry price');
    }
  }

  const mmrPct = symbolProfile?.maintenanceMarginPct ?? settings.maintenanceMarginPct;
  const mmr = mmrPct / 100;
  if (1 / leverage <= mmr) {
    throw new ApiError(
      400,
      'Leverage is too high: 1 / leverage must be greater than maintenance margin rate'
    );
  }

  const takerFeePct = settings.takerFeePct ?? 0;
  const slippagePct = settings.slippagePct ?? 0;
  const appliedFundingRatePct =
    fundingRatePct !== undefined && fundingRatePct !== null
      ? fundingRatePct
      : settings.defaultFundingRatePct ?? 0;

  const costs = calculateTradeCosts({
    side,
    entry,
    stopLoss: hasStop ? stopLoss : null,
    target: hasTarget ? target : null,
    takerFeePct,
    slippagePct,
    fundingRatePct: appliedFundingRatePct,
    fundingIntervals: fundingIntervals ?? 0,
  });

  const riskPctToUse =
    effectiveRiskPct !== null && effectiveRiskPct !== undefined
      ? effectiveRiskPct
      : settings.riskPerTradePct;

  const riskBudget = (balance * riskPctToUse) / 100;
  const stopDistance = hasStop ? Math.abs(entry - stopLoss) : null;
  const rawQuantity = hasQuantity ? inputQuantity : riskBudget / costs.lossPerUnit;

  const qtyStep = symbolProfile?.qtyStep ?? null;
  const quantity = roundDownToStep(rawQuantity, qtyStep);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(
      400,
      'Calculated quantity is 0 after rounding to symbol qtyStep'
    );
  }

  const notional = quantity * entry;
  if (symbolProfile?.minNotional && notional < symbolProfile.minNotional - EPS) {
    throw new ApiError(
      400,
      `Notional ($${notional.toFixed(2)}) is below ${symbolProfile.symbol} minimum notional ($${symbolProfile.minNotional})`
    );
  }

  const margin = notional / leverage;

  const liquidation =
    side === TRADE_SIDES.LONG
      ? entry * (1 - 1 / leverage + mmr)
      : entry * (1 + 1 / leverage - mmr);

  const liquidationDistancePct = (Math.abs(entry - liquidation) / entry) * 100;

  const stopBeyondLiquidation = hasStop
    ? side === TRADE_SIDES.LONG
      ? stopLoss <= liquidation
      : stopLoss >= liquidation
    : false;

  const entryFee = quantity * costs.entryFeePerUnit;
  const fundingCost = quantity * costs.fundingPerUnit;

  const amountAtRisk =
    !hasStop || stopBeyondLiquidation
      ? margin + entryFee + fundingCost
      : quantity * costs.lossPerUnit;

  const amountAtRiskPct = (amountAtRisk / balance) * 100;

  const potentialReward = hasTarget ? quantity * Math.abs(target - entry) : null;
  const netReward = hasTarget ? quantity * costs.netRewardPerUnit : null;

  const riskReward =
    hasTarget && hasStop ? Math.abs(target - entry) / stopDistance : null;
  const netRiskReward =
    hasTarget && hasStop && amountAtRisk > 0 ? netReward / amountAtRisk : null;

  return {
    balance,
    riskBudget,
    effectiveRiskPct: riskPctToUse,
    stopDistance,
    quantity,
    notional,
    margin,
    liquidation,
    liquidationDistancePct,
    stopBeyondLiquidation,
    amountAtRisk,
    amountAtRiskPct,
    potentialReward,
    netReward,
    riskReward,
    netRiskReward,
    breakEven: costs.breakEven,
    entryFee,
    fundingCost,
    estimatedExitCost: hasStop
      ? quantity * (costs.stopFeePerUnit + costs.stopSlippagePerUnit)
      : quantity * entry * (takerFeePct / 100 + slippagePct / 100),
    hasStop,
    hasTarget,
  };
}

/**
 * Compute realized PnL and R-multiple when closing an open trade (V1 compat / full exit).
 */
export function calculateCloseMetrics(trade, exitPrice, fees = 0) {
  if (!isPositiveFinite(exitPrice)) {
    throw new ApiError(400, 'Exit price must be a finite number greater than 0');
  }
  if (!isNonNegativeFinite(fees)) {
    throw new ApiError(400, 'Fees must be a finite number greater than or equal to 0');
  }

  const quantity = trade.remainingQuantity ?? trade.metrics?.quantity ?? trade.quantity;
  const amountAtRisk = trade.metrics?.amountAtRisk;

  if (!isPositiveFinite(quantity)) {
    throw new ApiError(400, 'Trade quantity must be greater than 0');
  }

  const rawPnl =
    trade.side === TRADE_SIDES.LONG
      ? (exitPrice - trade.entry) * quantity
      : (trade.entry - exitPrice) * quantity;

  const realizedPnl = rawPnl - fees;
  const rMultiple =
    isPositiveFinite(amountAtRisk) ? realizedPnl / amountAtRisk : null;

  return {
    realizedPnl,
    rMultiple,
  };
}
