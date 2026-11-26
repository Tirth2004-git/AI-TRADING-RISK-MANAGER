import crypto from 'node:crypto';
import env from '../config/env.js';
import AiReview from '../models/AiReview.js';
import Trade from '../models/Trade.js';
import { getOwnerFields, scopeQuery } from '../utils/scopeQuery.js';
import { analyzeTrade, getTradeById } from './trade.service.js';
import { getPortfolioPerformance, getPortfolioSummary } from './portfolio.service.js';
import { getBehaviourAnalytics } from './analytics.service.js';
import { generateGeminiJson } from '../ai/gemini.client.js';
import {
  buildPortfolioPrompt,
  buildTradePrompt,
  buildWeeklyPrompt,
  SYSTEM_INSTRUCTION,
} from '../ai/prompts.js';
import { aiResponseSchema, enforceVerdictFloor } from '../ai/response.schema.js';
import {
  generatePortfolioFallback,
  generateTradeFallback,
  generateWeeklyFallback,
} from '../ai/fallback.js';

function hashInput(type, payload, model) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ type, payload, model }))
    .digest('hex');
}

function sanitizeTradePayload(symbol, side, leverage, evaluation) {
  return {
    symbol,
    side,
    leverage,
    metrics: {
      quantity: evaluation.metrics.quantity,
      notional: evaluation.metrics.notional,
      margin: evaluation.metrics.margin,
      liquidation: evaluation.metrics.liquidation,
      liquidationDistancePct: evaluation.metrics.liquidationDistancePct,
      stopBeyondLiquidation: evaluation.metrics.stopBeyondLiquidation,
      amountAtRisk: evaluation.metrics.amountAtRisk,
      amountAtRiskPct: evaluation.metrics.amountAtRiskPct,
      potentialReward: evaluation.metrics.potentialReward,
      netReward: evaluation.metrics.netReward ?? null,
      riskReward: evaluation.metrics.riskReward,
      netRiskReward: evaluation.metrics.netRiskReward ?? null,
      breakEven: evaluation.metrics.breakEven ?? null,
      entryFee: evaluation.metrics.entryFee ?? 0,
      fundingCost: evaluation.metrics.fundingCost ?? 0,
      estimatedExitCost: evaluation.metrics.estimatedExitCost ?? 0,
      hasStop: evaluation.metrics.hasStop,
      hasTarget: evaluation.metrics.hasTarget,
    },
    riskScore: evaluation.riskScore,
    riskBand: evaluation.riskBand,
    scoreBreakdown: evaluation.scoreBreakdown,
    warnings: evaluation.warnings,
    guardrails: evaluation.guardrails
      ? {
          status: evaluation.guardrails.status,
          reasons: evaluation.guardrails.reasons,
        }
      : null,
  };
}

async function runWithCacheAndFallback(
  auth,
  { type, tradeId = null, sanitizedPayload, prompt, riskBand = null, fallbackFn }
) {
  const model = env.geminiModel;
  const inputHash = hashInput(type, sanitizedPayload, model);

  const cached = await AiReview.findOne(
    scopeQuery(auth, {
      type,
      inputHash,
      model,
      source: 'gemini',
    })
  ).lean();

  if (cached) {
    return cached;
  }

  let responseData = null;
  let source = 'fallback';

  if (env.geminiApiKey) {
    try {
      const rawText = await generateGeminiJson({
        model,
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt,
      });
      const parsedJson = JSON.parse(rawText);
      const validated = aiResponseSchema.parse(parsedJson);
      responseData = riskBand ? enforceVerdictFloor(validated, riskBand) : validated;
      source = 'gemini';
    } catch {
      responseData = fallbackFn(sanitizedPayload);
      source = 'fallback';
    }
  } else {
    responseData = fallbackFn(sanitizedPayload);
    source = 'fallback';
  }

  const saved = await AiReview.create({
    ...getOwnerFields(auth),
    type,
    tradeId,
    inputHash,
    response: responseData,
    source,
    model: source === 'gemini' ? model : 'rule-based-fallback',
  });

  return saved.toObject();
}

export async function reviewTrade(auth, input) {
  let tradeId = null;
  let sanitizedPayload;
  let riskBand;

  if ('tradeId' in input) {
    const trade = await getTradeById(auth, input.tradeId);
    tradeId = trade._id;
    riskBand = trade.riskBand;
    sanitizedPayload = sanitizeTradePayload(trade.symbol, trade.side, trade.leverage, {
      metrics: trade.metrics,
      riskScore: trade.riskScore,
      riskBand: trade.riskBand,
      scoreBreakdown: trade.scoreBreakdown,
      warnings: trade.warnings,
    });
  } else {
    const evaluation = await analyzeTrade(auth, input);
    riskBand = evaluation.riskBand;
    sanitizedPayload = sanitizeTradePayload(
      input.symbol,
      input.side,
      input.leverage,
      evaluation
    );
  }

  return runWithCacheAndFallback(auth, {
    type: 'TRADE',
    tradeId,
    sanitizedPayload,
    prompt: buildTradePrompt(sanitizedPayload),
    riskBand,
    fallbackFn: generateTradeFallback,
  });
}

export async function reviewPortfolio(auth) {
  const [summary, performance] = await Promise.all([
    getPortfolioSummary(auth),
    getPortfolioPerformance(auth),
  ]);

  const sanitizedPayload = {
    summary: {
      balance: summary.balance,
      openCount: summary.openCount,
      totalNotional: summary.totalNotional,
      marginUsed: summary.marginUsed,
      availableMargin: summary.availableMargin,
      openRiskAmount: summary.openRiskAmount,
      openRiskPct: summary.openRiskPct,
      effectiveLeverage: summary.effectiveLeverage,
      concentration: summary.concentration,
    },
    performance: {
      totalTrades: performance.totalTrades,
      winRate: performance.winRate,
      averageR: performance.averageR,
      expectancy: performance.expectancy,
      profitFactor: performance.profitFactor,
      currentDrawdownPct: performance.currentDrawdownPct,
      maxDrawdownPct: performance.maxDrawdownPct,
      currentLosingStreak: performance.currentLosingStreak,
    },
    warnings: summary.warnings,
  };

  return runWithCacheAndFallback(auth, {
    type: 'PORTFOLIO',
    sanitizedPayload,
    prompt: buildPortfolioPrompt(sanitizedPayload),
    fallbackFn: generatePortfolioFallback,
  });
}

export async function reviewWeekly(auth) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [performance, analytics, weeklyClosed] = await Promise.all([
    getPortfolioPerformance(auth),
    getBehaviourAnalytics(auth),
    Trade.find(
      scopeQuery(auth, {
        status: 'CLOSED',
        closedAt: { $gte: sevenDaysAgo },
      })
    ).lean(),
  ]);

  const weeklyWins = weeklyClosed.filter((t) => (t.realizedPnl ?? 0) > 0).length;
  const weeklyLosses = weeklyClosed.filter((t) => (t.realizedPnl ?? 0) < 0).length;
  const weeklyNetPnl = weeklyClosed.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);
  const weeklyFees = weeklyClosed.reduce((s, t) => s + (t.fees ?? 0), 0);
  const weeklyAvgRiskPct =
    weeklyClosed.length > 0
      ? weeklyClosed.reduce((s, t) => s + (t.metrics?.amountAtRiskPct ?? 0), 0) /
        weeklyClosed.length
      : 0;

  let bestTrade = null;
  let worstTrade = null;
  for (const t of weeklyClosed) {
    if (!bestTrade || (t.realizedPnl ?? 0) > bestTrade.realizedPnl) {
      bestTrade = {
        symbol: t.symbol,
        side: t.side,
        realizedPnl: t.realizedPnl ?? 0,
        rMultiple: t.rMultiple ?? null,
      };
    }
    if (!worstTrade || (t.realizedPnl ?? 0) < worstTrade.realizedPnl) {
      worstTrade = {
        symbol: t.symbol,
        side: t.side,
        realizedPnl: t.realizedPnl ?? 0,
        rMultiple: t.rMultiple ?? null,
      };
    }
  }

  const sanitizedPayload = {
    weeklyWindow: {
      tradesCount: weeklyClosed.length,
      wins: weeklyWins,
      losses: weeklyLosses,
      netPnl: weeklyNetPnl,
      totalFees: weeklyFees,
      avgRiskPct: weeklyAvgRiskPct,
      bestTrade,
      worstTrade,
    },
    performance: {
      totalTrades: performance.totalTrades,
      winRate: performance.winRate,
      averageR: performance.averageR,
      expectancy: performance.expectancy,
      profitFactor: performance.profitFactor,
      currentDrawdownPct: performance.currentDrawdownPct,
      maxDrawdownPct: performance.maxDrawdownPct,
    },
    flagCounts: analytics.flagCounts,
    bySetup: analytics.bySetup,
    bySymbol: analytics.bySymbol,
    bySide: analytics.bySide,
    byWeekday: analytics.byWeekday,
  };

  return runWithCacheAndFallback(auth, {
    type: 'WEEKLY',
    sanitizedPayload,
    prompt: buildWeeklyPrompt(sanitizedPayload),
    fallbackFn: generateWeeklyFallback,
  });
}
