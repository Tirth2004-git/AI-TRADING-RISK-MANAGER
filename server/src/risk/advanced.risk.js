import { EPS } from './constants.js';

/**
 * Analytical Risk of Ruin using Gambler's Ruin bisection on p*x^b + q*x^(-1) = 1.
 * Distinct from Monte Carlo bootstrap; assumes independent, identically distributed trades.
 */
export function calculateRiskOfRuin({
  winRatePct,
  avgWin,
  avgLoss,
  riskPerTradePct,
  ruinThresholdPct = 50,
}) {
  if (
    !Number.isFinite(winRatePct) ||
    winRatePct < 0 ||
    winRatePct > 100 ||
    !Number.isFinite(avgWin) ||
    avgWin <= 0 ||
    !Number.isFinite(avgLoss) ||
    avgLoss <= 0 ||
    !Number.isFinite(riskPerTradePct) ||
    riskPerTradePct <= 0 ||
    riskPerTradePct > 100
  ) {
    return {
      eligible: false,
      reason: 'Need positive average win, average loss, valid win rate (0-100%), and risk % (>0).',
      modelType: 'analytical',
    };
  }

  const p = winRatePct / 100;
  const q = 1 - p;
  const b = avgWin / avgLoss;
  const edgeR = p * b - q;
  const unitsToRuin = Math.max(1, Math.ceil(ruinThresholdPct / riskPerTradePct));

  let probRuin = 1;
  if (p >= 1 - EPS) {
    probRuin = 0;
  } else if (edgeR > EPS) {
    if (Math.abs(b - 1) < 1e-6) {
      probRuin = Math.pow(q / p, unitsToRuin);
    } else {
      // Solve f(x) = p*x^(b+1) - x + q = 0 for x in (0, 1)
      let lo = 1e-12;
      let hi = 1 - 1e-12;
      for (let i = 0; i < 80; i += 1) {
        const mid = (lo + hi) / 2;
        const val = p * Math.pow(mid, b + 1) - mid + q;
        if (val > 0) lo = mid;
        else hi = mid;
      }
      const xStar = (lo + hi) / 2;
      probRuin = Math.min(1, Math.max(0, Math.pow(xStar, unitsToRuin)));
    }
  }

  return {
    eligible: true,
    modelType: 'analytical',
    winRatePct,
    payoffRatio: b,
    edgeR,
    riskPerTradePct,
    ruinThresholdPct,
    unitsToRuin,
    riskOfRuinPct: probRuin * 100,
    note: 'Analytical estimate assuming independent identical trades; distinct from Monte Carlo bootstrap.',
  };
}

/**
 * Kelly Criterion calculator (Full, Half, Quarter, and custom fraction).
 * Does not modify user settings.
 */
export function calculateKelly({
  winRatePct,
  avgWin,
  avgLoss,
  customFraction = 0.25,
}) {
  if (
    !Number.isFinite(winRatePct) ||
    winRatePct < 0 ||
    winRatePct > 100 ||
    !Number.isFinite(avgWin) ||
    avgWin <= 0 ||
    !Number.isFinite(avgLoss) ||
    avgLoss <= 0
  ) {
    return {
      eligible: false,
      reason: 'Need positive average win, average loss, and valid win rate (0-100%).',
    };
  }

  const p = winRatePct / 100;
  const q = 1 - p;
  const b = avgWin / avgLoss;
  const rawKellyPct = (p - q / b) * 100;
  const fullKellyPct = Math.max(0, rawKellyPct);

  return {
    eligible: true,
    winRatePct,
    payoffRatio: b,
    rawKellyPct,
    fullKellyPct,
    halfKellyPct: fullKellyPct * 0.5,
    quarterKellyPct: fullKellyPct * 0.25,
    customFraction,
    customKellyPct: fullKellyPct * Math.max(0, Math.min(1, customFraction)),
    formula: 'f* = W - (1 - W) / (AvgWin / AvgLoss)',
  };
}

/**
 * Drawdown recovery metrics and historical max-drawdown recovery duration.
 */
export function calculateDrawdownRecovery(performance) {
  const currentDrawdownPct = performance?.currentDrawdownPct ?? 0;
  const maxDrawdownPct = performance?.maxDrawdownPct ?? 0;
  const currentEquity = performance?.currentBalance ?? 0;
  const peakEquity = performance?.peakBalance ?? currentEquity;

  const requiredRecoveryPct =
    currentDrawdownPct > EPS && currentDrawdownPct < 100 - EPS
      ? (currentDrawdownPct / (100 - currentDrawdownPct)) * 100
      : 0;

  let maxRecoveryTrades = null;
  const curve = performance?.equityCurve || [];
  if (curve.length > 1) {
    let peakIdx = 0;
    let maxSpan = 0;
    let recovered = false;
    for (let i = 1; i < curve.length; i += 1) {
      if (curve[i].equity >= curve[peakIdx].equity - EPS) {
        const span = i - peakIdx;
        if (span > maxSpan && curve[i - 1].drawdownPct > EPS) {
          maxSpan = span;
          recovered = true;
        }
        peakIdx = i;
      }
    }
    if (recovered) {
      maxRecoveryTrades = maxSpan;
    }
  }

  return {
    currentDrawdownPct,
    maxDrawdownPct,
    currentEquity,
    peakEquity,
    requiredRecoveryPct,
    historicalMaxRecoveryTrades: maxRecoveryTrades,
  };
}

/**
 * Compute Pearson correlation matrix from manually supplied symbol close-price series.
 * Returns limitation notice if insufficient data is supplied.
 */
export function calculateCorrelationMatrix(seriesMap = {}) {
  const symbols = Object.keys(seriesMap).filter(
    (s) => Array.isArray(seriesMap[s]) && seriesMap[s].length >= 3
  );

  if (symbols.length < 2) {
    return {
      eligible: false,
      reason:
        'At least 2 symbols with 3+ price observations each are required. Provide manual close-price series via CSV.',
      limitation:
        'This local-first app has no live market data feed; correlation is computed only on user-supplied prices. Correlation is not causation.',
    };
  }

  const returnsMap = {};
  for (const sym of symbols) {
    const prices = seriesMap[sym].map(Number).filter((v) => Number.isFinite(v) && v > 0);
    const rets = [];
    for (let i = 1; i < prices.length; i += 1) {
      rets.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    returnsMap[sym] = rets;
  }

  const matrix = {};
  for (const s1 of symbols) {
    matrix[s1] = {};
    for (const s2 of symbols) {
      if (s1 === s2) {
        matrix[s1][s2] = 1;
        continue;
      }
      const r1 = returnsMap[s1];
      const r2 = returnsMap[s2];
      const n = Math.min(r1.length, r2.length);
      if (n < 2) {
        matrix[s1][s2] = null;
        continue;
      }
      const a = r1.slice(-n);
      const b = r2.slice(-n);
      const meanA = a.reduce((s, v) => s + v, 0) / n;
      const meanB = b.reduce((s, v) => s + v, 0) / n;
      let num = 0;
      let denA = 0;
      let denB = 0;
      for (let i = 0; i < n; i += 1) {
        const da = a[i] - meanA;
        const db = b[i] - meanB;
        num += da * db;
        denA += da * da;
        denB += db * db;
      }
      const den = Math.sqrt(denA * denB);
      matrix[s1][s2] = den > EPS ? num / den : 0;
    }
  }

  return {
    eligible: true,
    symbols,
    matrix,
    limitation: 'Correlation is not causation; computed from user-supplied price series.',
  };
}
