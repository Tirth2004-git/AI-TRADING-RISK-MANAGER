import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import SymbolProfile from '../models/SymbolProfile.js';
import ApiError from '../utils/ApiError.js';
import { getKolkataDayBounds, getTodayRealizedPnl } from '../utils/date.js';
import { getOwnerFields, scopeQuery } from '../utils/scopeQuery.js';
import { EPS, RISK_BANDS, TRADE_STATUSES } from '../risk/constants.js';
import { calculateTradeMetrics } from '../risk/trade.risk.js';
import {
  calculateExitPnl,
  evaluateMarkState,
  validateStopMove,
} from '../risk/lifecycle.risk.js';
import { calculateEffectiveRiskPct } from '../risk/sizing.risk.js';
import { evaluateGuardrails } from '../risk/guardrails.risk.js';
import { calculateRiskScore } from '../risk/score.risk.js';
import { generateTradeWarnings } from '../risk/warnings.risk.js';
import { calculatePortfolioSummary } from '../risk/portfolio.risk.js';
import { calculatePerformance } from '../risk/performance.risk.js';
import { getSettings } from './settings.service.js';
import { getSymbolByCode } from './symbol.service.js';
import { logAudit } from './audit.service.js';

async function loadAccountContext(auth, excludeTradeId = null) {
  const now = new Date();
  const { start: dayStart, end: dayEnd } = getKolkataDayBounds(now);

  const [
    settings,
    openTrades,
    closedTrades,
    ledgerEntries,
    profiles,
    openedTodayCount,
  ] = await Promise.all([
    getSettings(auth),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.OPEN })).lean(),
    Trade.find(scopeQuery(auth, { status: TRADE_STATUSES.CLOSED }))
      .sort({ closedAt: 1 })
      .lean(),
    LedgerEntry.find(scopeQuery(auth)).sort({ date: 1 }).lean(),
    SymbolProfile.find(scopeQuery(auth)).lean(),
    Trade.countDocuments(
      scopeQuery(auth, {
        openedAt: { $gte: dayStart, $lt: dayEnd },
        status: { $ne: TRADE_STATUSES.CANCELLED },
      })
    ),
  ]);

  const filteredOpenTrades = excludeTradeId
    ? openTrades.filter((t) => String(t._id) !== String(excludeTradeId))
    : openTrades;

  const portfolio = calculatePortfolioSummary(
    filteredOpenTrades,
    closedTrades,
    settings.startingBalance,
    ledgerEntries,
    settings
  );
  const performance = calculatePerformance(
    closedTrades,
    settings.startingBalance,
    ledgerEntries
  );
  const todayRealizedPnl = getTodayRealizedPnl(closedTrades, now);
  const symbolProfilesMap = new Map(profiles.map((p) => [p.symbol, p]));

  return {
    settings,
    openTrades: filteredOpenTrades,
    closedTrades,
    ledgerEntries,
    symbolProfilesMap,
    openedTodayCount,
    portfolio,
    performance,
    todayRealizedPnl,
    now,
  };
}

function evaluateTradeWithContext(input, context, symbolProfile = null) {
  const {
    settings,
    openTrades,
    closedTrades,
    ledgerEntries,
    symbolProfilesMap,
    openedTodayCount,
    portfolio,
    performance,
    todayRealizedPnl,
    now,
  } = context;

  const sizing = calculateEffectiveRiskPct(
    settings.riskPerTradePct,
    performance.currentDrawdownPct,
    settings.drawdownTiers
  );

  const metrics = calculateTradeMetrics(
    input,
    portfolio.balance,
    settings,
    symbolProfile,
    sizing.effectiveRiskPct
  );

  const projectedOpenRiskAmount = portfolio.openRiskAmount + metrics.amountAtRisk;
  const projectedOpenRiskPct =
    portfolio.balance > 0 ? (projectedOpenRiskAmount / portfolio.balance) * 100 : 0;

  const { score, band, breakdown } = calculateRiskScore({
    metrics,
    leverage: input.leverage,
    settings,
    projectedOpenRiskPct,
    currentDrawdownPct: performance.currentDrawdownPct,
    effectiveRiskPct: sizing.effectiveRiskPct,
  });

  const warnings = generateTradeWarnings({
    symbol: input.symbol,
    leverage: input.leverage,
    metrics,
    settings,
    availableMargin: portfolio.availableMargin,
    balance: portfolio.balance,
    todayRealizedPnl,
    consecutiveLosses: performance.currentLosingStreak,
    openTrades,
  });

  const guardrails = evaluateGuardrails({
    settings,
    openTrades,
    closedTrades,
    allTradesOpenedTodayCount: openedTodayCount,
    ledgerEntries,
    symbolProfilesMap,
    candidate: {
      symbol: input.symbol,
      side: input.side,
      amountAtRisk: metrics.amountAtRisk,
      riskBand: band,
      warnings,
    },
    balance: portfolio.balance,
    openRiskAmount: portfolio.openRiskAmount,
    now,
  });

  const requiresAcknowledgement =
    band === RISK_BANDS.HIGH || band === RISK_BANDS.CRITICAL;

  const whatIfLeverages = [2, 5, 10, 20];
  const leverageWhatIf = whatIfLeverages.map((lev) => {
    try {
      const m = calculateTradeMetrics(
        { ...input, leverage: lev },
        portfolio.balance,
        settings,
        symbolProfile,
        sizing.effectiveRiskPct
      );
      return {
        leverage: lev,
        margin: m.margin,
        liquidation: m.liquidation,
        liquidationDistancePct: m.liquidationDistancePct,
        allowed: true,
      };
    } catch {
      return {
        leverage: lev,
        margin: null,
        liquidation: null,
        liquidationDistancePct: null,
        allowed: false,
      };
    }
  });

  return {
    metrics,
    sizing,
    riskScore: score,
    riskBand: band,
    scoreBreakdown: breakdown,
    warnings,
    guardrails,
    leverageWhatIf,
    requiresAcknowledgement,
  };
}

export async function analyzeTrade(auth, input, excludeTradeId = null) {
  const [context, symbolProfile] = await Promise.all([
    loadAccountContext(auth, excludeTradeId),
    getSymbolByCode(auth, input.symbol),
  ]);
  return evaluateTradeWithContext(input, context, symbolProfile);
}

export async function createTrade(auth, input) {
  const evaluation = await analyzeTrade(auth, input);

  if (evaluation.guardrails?.status === 'BLOCK') {
    const reason = String(input.overrideReason || '').trim();
    if (reason.length < 20) {
      throw new ApiError(
        400,
        `Trade is BLOCKED by guardrails (${evaluation.guardrails.blockReasons.join(' ')}). Provide an overrideReason of at least 20 characters to proceed.`
      );
    }
  }

  if (evaluation.requiresAcknowledgement && !input.acknowledged) {
    throw new ApiError(
      400,
      `This trade has a ${evaluation.riskBand} risk score (${evaluation.riskScore}/100). Tick "I understand the risk" (acknowledged: true) to save it.`
    );
  }

  const trade = await Trade.create({
    ...getOwnerFields(auth),
    symbol: input.symbol,
    side: input.side,
    entry: input.entry,
    stopLoss: input.stopLoss ?? null,
    initialStop: input.stopLoss ?? null,
    target: input.target ?? null,
    leverage: input.leverage,
    quantity: evaluation.metrics.quantity,
    initialQuantity: evaluation.metrics.quantity,
    remainingQuantity: evaluation.metrics.quantity,
    fundingRatePct: input.fundingRatePct ?? 0,
    fundingIntervals: input.fundingIntervals ?? 0,
    status: TRADE_STATUSES.OPEN,
    notes: input.notes || '',
    overrideReason: input.overrideReason || '',
    metrics: evaluation.metrics,
    riskScore: evaluation.riskScore,
    riskBand: evaluation.riskBand,
    scoreBreakdown: evaluation.scoreBreakdown,
    warnings: evaluation.warnings,
  });

  await logAudit(auth, {
    action: input.overrideReason ? 'OVERRIDE_CREATE' : 'CREATE',
    entity: 'Trade',
    entityId: trade._id,
    after: trade.toObject(),
    reason: input.overrideReason || '',
  });

  return trade.toObject();
}

export async function listTrades(auth, filters = {}) {
  const query = scopeQuery(auth);
  if (filters.status) {
    query.status = filters.status.toUpperCase();
  }
  if (filters.symbol) {
    query.symbol = filters.symbol.trim().toUpperCase();
  }
  if (filters.result) {
    const resFilter = filters.result.toLowerCase();
    if (resFilter === 'win') query.realizedPnl = { $gt: 0 };
    else if (resFilter === 'loss') query.realizedPnl = { $lt: 0 };
    else if (resFilter === 'breakeven') query.realizedPnl = 0;
  }

  const sortField = filters.sortBy === 'closedAt' ? 'closedAt' : 'openedAt';
  const sortDir = filters.sortOrder === 'asc' ? 1 : -1;
  const sortObj = { [sortField]: sortDir, createdAt: sortDir };

  const hasPagination =
    filters.page !== undefined || filters.limit !== undefined;

  if (!hasPagination) {
    const trades = await Trade.find(query).sort(sortObj).lean();
    return trades.map((t) =>
      t.status === TRADE_STATUSES.OPEN ? { ...t, markState: evaluateMarkState(t) } : t
    );
  }

  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [trades, totalRecords] = await Promise.all([
    Trade.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
    Trade.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const items = trades.map((t) =>
    t.status === TRADE_STATUSES.OPEN ? { ...t, markState: evaluateMarkState(t) } : t
  );

  return {
    items,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
}

export async function getTradeById(auth, id) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id })).lean();
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  return trade.status === TRADE_STATUSES.OPEN
    ? { ...trade, markState: evaluateMarkState(trade) }
    : trade;
}

export async function updateTrade(auth, id, input) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id }));
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (trade.status !== TRADE_STATUSES.OPEN) {
    throw new ApiError(400, 'Only OPEN trades can be edited');
  }
  if (Array.isArray(trade.exits) && trade.exits.length > 0) {
    throw new ApiError(
      400,
      'Trades with recorded partial exits cannot be edited; use move stop or add exit instead'
    );
  }

  const before = trade.toObject();
  const evaluation = await analyzeTrade(auth, input, id);

  if (evaluation.guardrails?.status === 'BLOCK') {
    const reason = String(input.overrideReason || '').trim();
    if (reason.length < 20) {
      throw new ApiError(
        400,
        `Trade is BLOCKED by guardrails (${evaluation.guardrails.blockReasons.join(' ')}). Provide an overrideReason of at least 20 characters to proceed.`
      );
    }
  }

  if (evaluation.requiresAcknowledgement && !input.acknowledged) {
    throw new ApiError(
      400,
      `This trade has a ${evaluation.riskBand} risk score (${evaluation.riskScore}/100). Tick "I understand the risk" (acknowledged: true) to save it.`
    );
  }

  trade.symbol = input.symbol;
  trade.side = input.side;
  trade.entry = input.entry;
  trade.stopLoss = input.stopLoss ?? null;
  if (trade.initialStop === null && input.stopLoss != null) {
    trade.initialStop = input.stopLoss;
  }
  trade.target = input.target ?? null;
  trade.leverage = input.leverage;
  trade.quantity = evaluation.metrics.quantity;
  trade.initialQuantity = evaluation.metrics.quantity;
  trade.remainingQuantity = evaluation.metrics.quantity;
  trade.fundingRatePct = input.fundingRatePct ?? 0;
  trade.fundingIntervals = input.fundingIntervals ?? 0;
  trade.notes = input.notes ?? trade.notes;
  if (input.overrideReason) {
    trade.overrideReason = input.overrideReason;
  }
  trade.metrics = evaluation.metrics;
  trade.riskScore = evaluation.riskScore;
  trade.riskBand = evaluation.riskBand;
  trade.scoreBreakdown = evaluation.scoreBreakdown;
  trade.warnings = evaluation.warnings;

  await trade.save();

  await logAudit(auth, {
    action: input.overrideReason ? 'OVERRIDE_EDIT' : 'EDIT',
    entity: 'Trade',
    entityId: trade._id,
    before,
    after: trade.toObject(),
    reason: input.overrideReason || '',
  });

  return trade.toObject();
}

export async function deleteTrade(auth, id) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id })).lean();
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (Array.isArray(trade.exits) && trade.exits.length > 0) {
    throw new ApiError(400, 'Trades with recorded exits cannot be deleted');
  }

  await Trade.deleteOne(scopeQuery(auth, { _id: id }));
  await logAudit(auth, {
    action: 'DELETE',
    entity: 'Trade',
    entityId: id,
    before: trade,
  });

  return trade;
}

export async function addExit(auth, id, { quantity, price, fee = 0, fundingPaid = 0 }) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id }));
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (trade.status !== TRADE_STATUSES.OPEN) {
    throw new ApiError(400, 'Only OPEN trades can record exits');
  }

  const initialQty = trade.initialQuantity ?? trade.quantity;
  const remainingQty = trade.remainingQuantity ?? trade.quantity;

  if (quantity > remainingQty + EPS) {
    throw new ApiError(
      400,
      `Exit quantity (${quantity}) exceeds remaining quantity (${remainingQty})`
    );
  }

  const before = trade.toObject();
  const exitPnl = calculateExitPnl({
    side: trade.side,
    entry: trade.entry,
    initialQuantity: initialQty,
    entryFee: trade.metrics?.entryFee ?? 0,
    exitQuantity: quantity,
    exitPrice: price,
    exitFee: fee,
    fundingPaid,
  });

  const exitRecord = {
    quantity,
    price,
    fee,
    fundingPaid,
    pnl: exitPnl,
    time: new Date(),
  };

  trade.exits = [...(trade.exits || []), exitRecord];
  const nextRemaining = Math.max(0, remainingQty - quantity);
  trade.remainingQuantity = nextRemaining <= EPS ? 0 : nextRemaining;

  const totalPnl = trade.exits.reduce((sum, ex) => sum + ex.pnl, 0);
  const totalFees =
    (trade.metrics?.entryFee ?? 0) +
    trade.exits.reduce((sum, ex) => sum + (ex.fee || 0), 0);

  trade.realizedPnl = totalPnl;
  trade.fees = totalFees;

  const initialRisk = trade.metrics?.amountAtRisk;
  trade.rMultiple =
    initialRisk && initialRisk > 0 ? totalPnl / initialRisk : null;

  if (trade.remainingQuantity === 0) {
    trade.status = TRADE_STATUSES.CLOSED;
    trade.exitPrice = price;
    trade.closedAt = new Date();
  }

  await trade.save();

  await logAudit(auth, {
    action: 'EXIT',
    entity: 'Trade',
    entityId: trade._id,
    before,
    after: trade.toObject(),
  });

  return trade.toObject();
}

export async function closeTrade(auth, id, { exitPrice, fees = 0, fundingPaid = 0 }) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id })).lean();
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (trade.status !== TRADE_STATUSES.OPEN) {
    throw new ApiError(400, 'Only OPEN trades can be closed');
  }

  const remainingQty = trade.remainingQuantity ?? trade.quantity;
  return addExit(auth, id, {
    quantity: remainingQty,
    price: exitPrice,
    fee: fees,
    fundingPaid,
  });
}

export async function moveStop(auth, id, { stopLoss, reason = '' }) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id }));
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (trade.status !== TRADE_STATUSES.OPEN) {
    throw new ApiError(400, 'Stop-loss can only be moved on OPEN trades');
  }

  const oldStop = trade.stopLoss;
  const { isWidening } = validateStopMove({
    side: trade.side,
    oldStop,
    newStop: stopLoss,
    markPrice: trade.markPrice,
    entry: trade.entry,
    reason,
  });

  const before = trade.toObject();
  if (trade.initialStop === null && oldStop !== null) {
    trade.initialStop = oldStop;
  }

  trade.stopLoss = stopLoss;
  trade.stopHistory = [
    ...(trade.stopHistory || []),
    {
      from: oldStop,
      to: stopLoss,
      reason: reason || (isWidening ? 'Widened stop' : 'Tightened stop'),
      time: new Date(),
    },
  ];

  await trade.save();

  await logAudit(auth, {
    action: 'STOP_MOVE',
    entity: 'Trade',
    entityId: trade._id,
    before,
    after: trade.toObject(),
    reason,
  });

  return trade.toObject();
}

export async function updateMarkPrice(auth, id, { markPrice }) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id }));
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (trade.status !== TRADE_STATUSES.OPEN) {
    throw new ApiError(400, 'Mark price can only be updated on OPEN trades');
  }

  trade.markPrice = markPrice;
  trade.markUpdatedAt = new Date();
  await trade.save();

  const obj = trade.toObject();
  return { ...obj, markState: evaluateMarkState(obj) };
}

export async function updateJournal(auth, id, journalData) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id }));
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }

  trade.setupTag = journalData.setupTag ?? trade.setupTag;
  trade.emotionTag = journalData.emotionTag ?? trade.emotionTag;
  trade.followedPlan = journalData.followedPlan ?? trade.followedPlan;
  trade.lesson = journalData.lesson ?? trade.lesson;

  await trade.save();
  return trade.toObject();
}

export async function cancelTrade(auth, id) {
  const trade = await Trade.findOne(scopeQuery(auth, { _id: id }));
  if (!trade) {
    throw new ApiError(404, 'Trade not found');
  }
  if (trade.status !== TRADE_STATUSES.OPEN) {
    throw new ApiError(400, 'Only OPEN trades can be cancelled');
  }
  if (Array.isArray(trade.exits) && trade.exits.length > 0) {
    throw new ApiError(400, 'Trades with partial exits cannot be cancelled');
  }

  const before = trade.toObject();
  trade.status = TRADE_STATUSES.CANCELLED;
  trade.closedAt = new Date();

  await trade.save();
  await logAudit(auth, {
    action: 'CANCEL',
    entity: 'Trade',
    entityId: trade._id,
    before,
    after: trade.toObject(),
  });

  return trade.toObject();
}
