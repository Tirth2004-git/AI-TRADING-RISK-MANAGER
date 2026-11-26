import Settings from '../models/Settings.js';
import SymbolProfile from '../models/SymbolProfile.js';
import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AuditLog from '../models/AuditLog.js';
import AiReview from '../models/AiReview.js';
import ApiError from '../utils/ApiError.js';
import { DEFAULT_SETTINGS, TRADE_STATUSES } from '../risk/constants.js';
import { calculateTradeMetrics } from '../risk/trade.risk.js';
import { calculateRiskScore } from '../risk/score.risk.js';
import { calculateExitPnl } from '../risk/lifecycle.risk.js';
import { getSettings } from './settings.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_SYMBOLS = [
  {
    symbol: 'BTCUSDT',
    maintenanceMarginPct: 0.4,
    maxLeverage: 20,
    qtyStep: 0.001,
    minNotional: 10,
    correlationGroup: 'MAJORS',
    beta: 1.0,
  },
  {
    symbol: 'ETHUSDT',
    maintenanceMarginPct: 0.5,
    maxLeverage: 20,
    qtyStep: 0.001,
    minNotional: 10,
    correlationGroup: 'MAJORS',
    beta: 1.15,
  },
  {
    symbol: 'SOLUSDT',
    maintenanceMarginPct: 0.5,
    maxLeverage: 15,
    qtyStep: 0.01,
    minNotional: 10,
    correlationGroup: 'ALTS',
    beta: 1.4,
  },
  {
    symbol: 'XRPUSDT',
    maintenanceMarginPct: 0.5,
    maxLeverage: 15,
    qtyStep: 1,
    minNotional: 10,
    correlationGroup: 'ALTS',
    beta: 1.2,
  },
  {
    symbol: 'BNBUSDT',
    maintenanceMarginPct: 0.5,
    maxLeverage: 15,
    qtyStep: 0.01,
    minNotional: 10,
    correlationGroup: 'MAJORS',
    beta: 1.05,
  },
];

const CLOSED_TEMPLATES = [
  { daysAgo: 82, symbol: 'BTCUSDT', side: 'LONG', entry: 58200, stop: 56900, target: 61500, lev: 5, exitR: 1.8, setup: 'BREAKOUT', emotion: 'CALM', followed: true, partial: true },
  { daysAgo: 79, symbol: 'ETHUSDT', side: 'LONG', entry: 2820, stop: 2740, target: 3000, lev: 5, exitR: -1.0, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 76, symbol: 'SOLUSDT', side: 'SHORT', entry: 158, stop: 164, target: 144, lev: 5, exitR: 2.1, setup: 'MEAN_REVERSION', emotion: 'FOCUSED', followed: true, partial: false },
  { daysAgo: 73, symbol: 'XRPUSDT', side: 'LONG', entry: 0.54, stop: 0.52, target: 0.59, lev: 5, exitR: 1.6, setup: 'TREND_FOLLOW', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 70, symbol: 'BNBUSDT', side: 'LONG', entry: 540, stop: 525, target: 575, lev: 5, exitR: -1.0, setup: 'BREAKOUT', emotion: 'FOMO', followed: false, partial: false },
  { daysAgo: 67, symbol: 'BTCUSDT', side: 'SHORT', entry: 61400, stop: 62600, target: 58500, lev: 8, exitR: 1.9, setup: 'MEAN_REVERSION', emotion: 'CALM', followed: true, partial: true },
  { daysAgo: 64, symbol: 'ETHUSDT', side: 'LONG', entry: 2950, stop: 2870, target: 3140, lev: 5, exitR: 1.4, setup: 'PULLBACK', emotion: 'FOCUSED', followed: true, partial: false },
  { daysAgo: 61, symbol: 'SOLUSDT', side: 'LONG', entry: 142, stop: 136, target: 156, lev: 6, exitR: -1.0, setup: 'BREAKOUT', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 58, symbol: 'BTCUSDT', side: 'LONG', entry: 59800, stop: 58500, target: 62800, lev: 5, exitR: 2.2, setup: 'TREND_FOLLOW', emotion: 'CALM', followed: true, partial: true },
  { daysAgo: 55, symbol: 'XRPUSDT', side: 'SHORT', entry: 0.58, stop: 0.60, target: 0.53, lev: 5, exitR: -1.0, setup: 'MEAN_REVERSION', emotion: 'FOMO', followed: false, partial: false },
  { daysAgo: 52, symbol: 'BNBUSDT', side: 'LONG', entry: 552, stop: 538, target: 585, lev: 5, exitR: 1.7, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 48, symbol: 'ETHUSDT', side: 'SHORT', entry: 3180, stop: 3270, target: 2960, lev: 8, exitR: 2.0, setup: 'MEAN_REVERSION', emotion: 'FOCUSED', followed: true, partial: true },
  { daysAgo: 45, symbol: 'SOLUSDT', side: 'LONG', entry: 149, stop: 143, target: 163, lev: 5, exitR: 1.5, setup: 'TREND_FOLLOW', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 42, symbol: 'BTCUSDT', side: 'LONG', entry: 62500, stop: 61200, target: 65500, lev: 10, exitR: -1.0, setup: 'BREAKOUT', emotion: 'FOMO', followed: false, partial: false },
  { daysAgo: 39, symbol: 'ETHUSDT', side: 'LONG', entry: 3040, stop: 2960, target: 3220, lev: 5, exitR: -1.0, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 36, symbol: 'XRPUSDT', side: 'LONG', entry: 0.56, stop: 0.54, target: 0.61, lev: 5, exitR: 2.3, setup: 'BREAKOUT', emotion: 'FOCUSED', followed: true, partial: false },
  { daysAgo: 33, symbol: 'BNBUSDT', side: 'SHORT', entry: 590, stop: 604, target: 558, lev: 5, exitR: 1.6, setup: 'MEAN_REVERSION', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 30, symbol: 'BTCUSDT', side: 'LONG', entry: 61900, stop: 60700, target: 64800, lev: 5, exitR: 2.0, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: true },
  { daysAgo: 27, symbol: 'SOLUSDT', side: 'SHORT', entry: 168, stop: 174, target: 154, lev: 5, exitR: -1.0, setup: 'MEAN_REVERSION', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 24, symbol: 'ETHUSDT', side: 'LONG', entry: 3110, stop: 3030, target: 3300, lev: 6, exitR: 1.8, setup: 'TREND_FOLLOW', emotion: 'FOCUSED', followed: true, partial: false },
  { daysAgo: 21, symbol: 'BTCUSDT', side: 'SHORT', entry: 64900, stop: 66100, target: 62200, lev: 8, exitR: -1.0, setup: 'MEAN_REVERSION', emotion: 'FOMO', followed: false, partial: false },
  { daysAgo: 18, symbol: 'BNBUSDT', side: 'LONG', entry: 568, stop: 554, target: 600, lev: 5, exitR: 1.9, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 15, symbol: 'XRPUSDT', side: 'LONG', entry: 0.59, stop: 0.57, target: 0.64, lev: 5, exitR: 1.5, setup: 'TREND_FOLLOW', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 13, symbol: 'SOLUSDT', side: 'LONG', entry: 154, stop: 148, target: 168, lev: 5, exitR: 2.1, setup: 'BREAKOUT', emotion: 'FOCUSED', followed: true, partial: true },
  { daysAgo: 11, symbol: 'ETHUSDT', side: 'SHORT', entry: 3290, stop: 3370, target: 3100, lev: 6, exitR: -1.0, setup: 'MEAN_REVERSION', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 8, symbol: 'BTCUSDT', side: 'LONG', entry: 63400, stop: 62100, target: 66400, lev: 5, exitR: 1.7, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 6, symbol: 'BNBUSDT', side: 'LONG', entry: 582, stop: 569, target: 612, lev: 5, exitR: -1.0, setup: 'BREAKOUT', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 4, symbol: 'SOLUSDT', side: 'LONG', entry: 161, stop: 155, target: 175, lev: 5, exitR: 1.9, setup: 'TREND_FOLLOW', emotion: 'FOCUSED', followed: true, partial: false },
  { daysAgo: 2, symbol: 'ETHUSDT', side: 'LONG', entry: 3180, stop: 3100, target: 3360, lev: 5, exitR: 1.6, setup: 'PULLBACK', emotion: 'CALM', followed: true, partial: false },
  { daysAgo: 0.1, symbol: 'BTCUSDT', side: 'LONG', entry: 64200, stop: 63000, target: 67000, lev: 5, exitR: 1.5, setup: 'BREAKOUT', emotion: 'CALM', followed: true, partial: false },
];

const OPEN_TEMPLATES = [
  { daysAgo: 2, symbol: 'BTCUSDT', side: 'LONG', entry: 64800, stop: 63500, target: 68000, lev: 5, mark: 65450, setup: 'PULLBACK', partialExit: true },
  { daysAgo: 1.5, symbol: 'ETHUSDT', side: 'LONG', entry: 3240, stop: 3150, target: 3460, lev: 5, mark: 3295, setup: 'TREND_FOLLOW', partialExit: false },
  { daysAgo: 1, symbol: 'SOLUSDT', side: 'SHORT', entry: 172, stop: 178, target: 158, lev: 5, mark: 169.5, setup: 'MEAN_REVERSION', partialExit: false },
  { daysAgo: 0.8, symbol: 'XRPUSDT', side: 'LONG', entry: 0.61, stop: 0.59, target: 0.66, lev: 5, mark: 0.618, setup: 'BREAKOUT', partialExit: false },
  { daysAgo: 0.5, symbol: 'BNBUSDT', side: 'LONG', entry: 592, stop: 578, target: 625, lev: 5, mark: 589, setup: 'PULLBACK', partialExit: false },
];

const CANCELLED_TEMPLATES = [
  { daysAgo: 60, symbol: 'BTCUSDT', side: 'LONG', entry: 60500, stop: 59200, target: 63500, lev: 5 },
  { daysAgo: 44, symbol: 'ETHUSDT', side: 'SHORT', entry: 3150, stop: 3240, target: 2950, lev: 5 },
  { daysAgo: 28, symbol: 'SOLUSDT', side: 'LONG', entry: 156, stop: 150, target: 170, lev: 5 },
  { daysAgo: 14, symbol: 'XRPUSDT', side: 'LONG', entry: 0.58, stop: 0.56, target: 0.63, lev: 5 },
  { daysAgo: 5, symbol: 'BNBUSDT', side: 'SHORT', entry: 595, stop: 610, target: 565, lev: 5 },
];

export async function getDemoStatus() {
  const [
    demoTrades,
    demoOpen,
    demoClosed,
    demoCancelled,
    demoLedger,
    demoSymbols,
    demoAudit,
    userTrades,
    userLedger,
    userSymbols,
  ] = await Promise.all([
    Trade.countDocuments({ isDemo: true }),
    Trade.countDocuments({ isDemo: true, status: TRADE_STATUSES.OPEN }),
    Trade.countDocuments({ isDemo: true, status: TRADE_STATUSES.CLOSED }),
    Trade.countDocuments({ isDemo: true, status: TRADE_STATUSES.CANCELLED }),
    LedgerEntry.countDocuments({ isDemo: true }),
    SymbolProfile.countDocuments({ isDemo: true }),
    AuditLog.countDocuments({ isDemo: true }),
    Trade.countDocuments({ isDemo: { $ne: true } }),
    LedgerEntry.countDocuments({ isDemo: { $ne: true } }),
    SymbolProfile.countDocuments({ isDemo: { $ne: true } }),
  ]);

  return {
    active: demoTrades > 0 || demoLedger > 0 || demoSymbols > 0,
    counts: {
      trades: demoTrades,
      openTrades: demoOpen,
      closedTrades: demoClosed,
      cancelledTrades: demoCancelled,
      ledgerEntries: demoLedger,
      symbolProfiles: demoSymbols,
      auditLogs: demoAudit,
    },
    userCounts: {
      trades: userTrades,
      ledgerEntries: userLedger,
      symbolProfiles: userSymbols,
    },
  };
}

export async function generateDemoData() {
  const existingStatus = await getDemoStatus();
  if (existingStatus.active) {
    return {
      alreadySeeded: true,
      status: existingStatus,
    };
  }

  const settings = await getSettings({ isDemo: true });
  const now = Date.now();

  // 1. Ensure demo symbol profiles exist
  const profileMap = new Map();
  let createdSymbols = 0;
  for (const symDef of DEMO_SYMBOLS) {
    let existing = await SymbolProfile.findOne({
      symbol: symDef.symbol,
      isDemo: true,
    }).lean();
    if (!existing) {
      const created = await SymbolProfile.create({
        ...symDef,
        userId: null,
        isDemo: true,
      });
      existing = created.toObject();
      createdSymbols += 1;
    }
    profileMap.set(symDef.symbol, existing);
  }

  // 2. Create demo ledger entries
  const ledgerDefs = [
    { type: 'DEPOSIT', amount: 2500, daysAgo: 85, note: '[DEMO] Initial capital addition' },
    { type: 'DEPOSIT', amount: 1500, daysAgo: 50, note: '[DEMO] Account top-up' },
    { type: 'WITHDRAWAL', amount: 1000, daysAgo: 25, note: '[DEMO] Profit withdrawal' },
    { type: 'DEPOSIT', amount: 500, daysAgo: 10, note: '[DEMO] Margin buffer' },
  ];

  const ledgerDocs = await LedgerEntry.insertMany(
    ledgerDefs.map((l) => ({
      type: l.type,
      amount: l.amount,
      date: new Date(now - l.daysAgo * DAY_MS),
      note: l.note,
      isDemo: true,
    }))
  );

  // Track chronological running balance for realistic historical sizing
  let runningBalance = settings.startingBalance ?? DEFAULT_SETTINGS.startingBalance;
  const ledgerEvents = ledgerDocs
    .map((l) => ({ ms: l.date.getTime(), delta: l.type === 'DEPOSIT' ? l.amount : -l.amount }))
    .sort((a, b) => a.ms - b.ms);
  let ledgerIdx = 0;

  // 3. Create 30 closed trades chronologically
  const tradeDocsToInsert = [];
  for (const tpl of CLOSED_TEMPLATES) {
    const openedAt = new Date(now - tpl.daysAgo * DAY_MS);
    const closedAt = new Date(openedAt.getTime() + 4 * 60 * 60 * 1000);
    while (ledgerIdx < ledgerEvents.length && ledgerEvents[ledgerIdx].ms <= openedAt.getTime()) {
      runningBalance += ledgerEvents[ledgerIdx].delta;
      ledgerIdx += 1;
    }

    const profile = profileMap.get(tpl.symbol);
    const input = {
      symbol: tpl.symbol,
      side: tpl.side,
      entry: tpl.entry,
      stopLoss: tpl.stop,
      target: tpl.target,
      leverage: tpl.lev,
      fundingRatePct: settings.defaultFundingRatePct ?? 0.01,
      fundingIntervals: 1,
    };

    const metrics = calculateTradeMetrics(input, Math.max(100, runningBalance), settings, profile);
    const { score, band, breakdown } = calculateRiskScore({
      metrics,
      leverage: tpl.lev,
      settings,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
      effectiveRiskPct: metrics.effectiveRiskPct,
    });

    const stopDist = Math.abs(tpl.entry - tpl.stop);
    const dir = tpl.side === 'LONG' ? 1 : -1;
    const exitPrice = Number((tpl.entry + dir * stopDist * tpl.exitR).toFixed(4));
    const feeRate = (settings.takerFeePct ?? 0.05) / 100;
    const fundingPaid = Number((metrics.fundingCost || 0).toFixed(4));

    const exits = [];
    if (tpl.partial && metrics.quantity >= 0.02) {
      const q1 = Number((metrics.quantity * 0.5).toFixed(4));
      const q2 = Number((metrics.quantity - q1).toFixed(4));
      const p1 = Number((tpl.entry + dir * stopDist * (tpl.exitR * 0.8)).toFixed(4));
      const f1 = q1 * p1 * feeRate;
      const f2 = q2 * exitPrice * feeRate;
      exits.push({
        quantity: q1,
        price: p1,
        fee: f1,
        fundingPaid: fundingPaid * 0.5,
        pnl: calculateExitPnl({
          side: tpl.side,
          entry: tpl.entry,
          initialQuantity: metrics.quantity,
          entryFee: metrics.entryFee,
          exitQuantity: q1,
          exitPrice: p1,
          exitFee: f1,
          fundingPaid: fundingPaid * 0.5,
        }),
        time: new Date(openedAt.getTime() + 2 * 60 * 60 * 1000),
      });
      exits.push({
        quantity: q2,
        price: exitPrice,
        fee: f2,
        fundingPaid: fundingPaid * 0.5,
        pnl: calculateExitPnl({
          side: tpl.side,
          entry: tpl.entry,
          initialQuantity: metrics.quantity,
          entryFee: metrics.entryFee,
          exitQuantity: q2,
          exitPrice,
          exitFee: f2,
          fundingPaid: fundingPaid * 0.5,
        }),
        time: closedAt,
      });
    } else {
      const exitFee = metrics.quantity * exitPrice * feeRate;
      exits.push({
        quantity: metrics.quantity,
        price: exitPrice,
        fee: exitFee,
        fundingPaid,
        pnl: calculateExitPnl({
          side: tpl.side,
          entry: tpl.entry,
          initialQuantity: metrics.quantity,
          entryFee: metrics.entryFee,
          exitQuantity: metrics.quantity,
          exitPrice,
          exitFee,
          fundingPaid,
        }),
        time: closedAt,
      });
    }

    const realizedPnl = exits.reduce((s, e) => s + e.pnl, 0);
    const totalFees =
      (metrics.entryFee ?? 0) + exits.reduce((s, e) => s + (e.fee || 0), 0);
    const rMultiple =
      metrics.amountAtRisk > 0 ? realizedPnl / metrics.amountAtRisk : null;

    runningBalance += realizedPnl;

    tradeDocsToInsert.push({
      symbol: tpl.symbol,
      side: tpl.side,
      entry: tpl.entry,
      stopLoss: tpl.stop,
      initialStop: tpl.stop,
      target: tpl.target,
      leverage: tpl.lev,
      quantity: metrics.quantity,
      initialQuantity: metrics.quantity,
      remainingQuantity: 0,
      fundingRatePct: settings.defaultFundingRatePct ?? 0.01,
      fundingIntervals: 1,
      exits,
      status: TRADE_STATUSES.CLOSED,
      exitPrice,
      fees: totalFees,
      openedAt,
      closedAt,
      notes: '[DEMO DATA] Simulated historical trade',
      setupTag: tpl.setup,
      emotionTag: tpl.emotion,
      followedPlan: tpl.followed,
      lesson: tpl.followed
        ? 'Executed according to pre-trade risk plan.'
        : 'Avoid entering without waiting for confirmation.',
      metrics,
      riskScore: score,
      riskBand: band,
      scoreBreakdown: breakdown,
      warnings: [],
      realizedPnl,
      rMultiple,
      isDemo: true,
    });
  }

  // 4. Create 5 open trades
  while (ledgerIdx < ledgerEvents.length) {
    runningBalance += ledgerEvents[ledgerIdx].delta;
    ledgerIdx += 1;
  }

  for (const tpl of OPEN_TEMPLATES) {
    const openedAt = new Date(now - tpl.daysAgo * DAY_MS);
    const profile = profileMap.get(tpl.symbol);
    const input = {
      symbol: tpl.symbol,
      side: tpl.side,
      entry: tpl.entry,
      stopLoss: tpl.stop,
      target: tpl.target,
      leverage: tpl.lev,
      fundingRatePct: settings.defaultFundingRatePct ?? 0.01,
      fundingIntervals: 1,
    };
    const metrics = calculateTradeMetrics(input, Math.max(100, runningBalance), settings, profile);
    const { score, band, breakdown } = calculateRiskScore({
      metrics,
      leverage: tpl.lev,
      settings,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
      effectiveRiskPct: metrics.effectiveRiskPct,
    });

    let remainingQuantity = metrics.quantity;
    const exits = [];
    let realizedPnl = null;

    if (tpl.partialExit && metrics.quantity >= 0.02) {
      const q1 = Number((metrics.quantity * 0.25).toFixed(4));
      const exitFee = q1 * tpl.mark * ((settings.takerFeePct ?? 0.05) / 100);
      exits.push({
        quantity: q1,
        price: tpl.mark,
        fee: exitFee,
        fundingPaid: 0,
        pnl: calculateExitPnl({
          side: tpl.side,
          entry: tpl.entry,
          initialQuantity: metrics.quantity,
          entryFee: metrics.entryFee,
          exitQuantity: q1,
          exitPrice: tpl.mark,
          exitFee,
          fundingPaid: 0,
        }),
        time: new Date(now - 2 * 60 * 60 * 1000),
      });
      remainingQuantity = Number((metrics.quantity - q1).toFixed(4));
      realizedPnl = exits[0].pnl;
    }

    tradeDocsToInsert.push({
      symbol: tpl.symbol,
      side: tpl.side,
      entry: tpl.entry,
      stopLoss: tpl.stop,
      initialStop: tpl.stop,
      target: tpl.target,
      leverage: tpl.lev,
      quantity: metrics.quantity,
      initialQuantity: metrics.quantity,
      remainingQuantity,
      markPrice: tpl.mark,
      markUpdatedAt: new Date(now - 30 * 60 * 1000),
      fundingRatePct: settings.defaultFundingRatePct ?? 0.01,
      fundingIntervals: 1,
      exits,
      status: TRADE_STATUSES.OPEN,
      openedAt,
      notes: '[DEMO DATA] Simulated open position',
      setupTag: tpl.setup,
      emotionTag: 'CALM',
      followedPlan: true,
      metrics,
      riskScore: score,
      riskBand: band,
      scoreBreakdown: breakdown,
      warnings: [],
      realizedPnl,
      isDemo: true,
    });
  }

  // 5. Create 5 cancelled trades
  for (const tpl of CANCELLED_TEMPLATES) {
    const openedAt = new Date(now - tpl.daysAgo * DAY_MS);
    const profile = profileMap.get(tpl.symbol);
    const input = {
      symbol: tpl.symbol,
      side: tpl.side,
      entry: tpl.entry,
      stopLoss: tpl.stop,
      target: tpl.target,
      leverage: tpl.lev,
    };
    const metrics = calculateTradeMetrics(input, Math.max(100, runningBalance), settings, profile);
    const { score, band, breakdown } = calculateRiskScore({
      metrics,
      leverage: tpl.lev,
      settings,
      projectedOpenRiskPct: metrics.amountAtRiskPct,
      currentDrawdownPct: 0,
      effectiveRiskPct: metrics.effectiveRiskPct,
    });

    tradeDocsToInsert.push({
      symbol: tpl.symbol,
      side: tpl.side,
      entry: tpl.entry,
      stopLoss: tpl.stop,
      initialStop: tpl.stop,
      target: tpl.target,
      leverage: tpl.lev,
      quantity: metrics.quantity,
      initialQuantity: metrics.quantity,
      remainingQuantity: metrics.quantity,
      status: TRADE_STATUSES.CANCELLED,
      openedAt,
      closedAt: new Date(openedAt.getTime() + 15 * 60 * 1000),
      notes: '[DEMO DATA] Cancelled setup',
      metrics,
      riskScore: score,
      riskBand: band,
      scoreBreakdown: breakdown,
      warnings: [],
      isDemo: true,
    });
  }

  await Trade.insertMany(tradeDocsToInsert);
  await AuditLog.create({
    action: 'DEMO_SEED',
    entity: 'DemoMode',
    reason: 'Generated simulated 90-day demo dataset',
    time: new Date(),
    isDemo: true,
  });

  const status = await getDemoStatus();
  return {
    alreadySeeded: false,
    created: {
      trades: tradeDocsToInsert.length,
      ledgerEntries: ledgerDocs.length,
      symbolProfiles: createdSymbols,
    },
    status,
  };
}

export async function resetDemoData({ confirm = false } = {}) {
  if (confirm !== true) {
    throw new ApiError(
      400,
      'Confirmation is required to reset demo data (pass confirm: true).'
    );
  }

  const [tradesRes, ledgerRes, symbolsRes, auditRes, aiRes] = await Promise.all([
    Trade.deleteMany({ isDemo: true }),
    LedgerEntry.deleteMany({ isDemo: true }),
    SymbolProfile.deleteMany({ isDemo: true }),
    AuditLog.deleteMany({ isDemo: true }),
    AiReview.deleteMany({ isDemo: true }),
  ]);

  return {
    deleted: {
      trades: tradesRes.deletedCount || 0,
      ledgerEntries: ledgerRes.deletedCount || 0,
      symbolProfiles: symbolsRes.deletedCount || 0,
      auditLogs: auditRes.deletedCount || 0,
      aiReviews: aiRes.deletedCount || 0,
    },
    status: await getDemoStatus(),
  };
}
