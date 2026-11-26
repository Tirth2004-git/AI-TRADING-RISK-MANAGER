/**
 * Deterministic Mulberry32 PRNG for reproducible Monte Carlo runs.
 */
function createSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  const weight = idx - lo;
  return sortedArr[lo] * (1 - weight) + sortedArr[hi] * weight;
}

/**
 * Run Monte Carlo bootstrap simulation from historical closed-trade R-multiples.
 * Requires at least 30 closed trades with valid R-multiples.
 */
export function runMonteCarlo({
  rMultiples = [],
  startingEquity = 10000,
  riskFraction = 0.01,
  runs = 10000,
  tradesPerRun = 100,
  seed = 42,
}) {
  const validRs = rMultiples.filter((r) => typeof r === 'number' && Number.isFinite(r));
  const requiredTrades = 30;

  if (validRs.length < requiredTrades) {
    return {
      eligible: false,
      closedTradesCount: validRs.length,
      requiredTrades,
      tradesNeeded: requiredTrades - validRs.length,
      label: 'simulation from your own history, not a prediction',
    };
  }

  const rng = createSeededRng(seed);
  const finalEquities = new Array(runs);
  let dd20Count = 0;
  let dd30Count = 0;
  let dd50Count = 0;

  for (let r = 0; r < runs; r += 1) {
    let equity = startingEquity;
    let peak = startingEquity;
    let maxDd = 0;

    for (let t = 0; t < tradesPerRun; t += 1) {
      const sampleR = validRs[Math.floor(rng() * validRs.length)];
      equity = Math.max(0, equity * (1 + riskFraction * sampleR));
      if (equity > peak) peak = equity;
      if (peak > 0) {
        const dd = ((peak - equity) / peak) * 100;
        if (dd > maxDd) maxDd = dd;
      }
    }

    finalEquities[r] = equity;
    if (maxDd >= 20) dd20Count += 1;
    if (maxDd >= 30) dd30Count += 1;
    if (maxDd >= 50) dd50Count += 1;
  }

  finalEquities.sort((a, b) => a - b);

  return {
    eligible: true,
    closedTradesCount: validRs.length,
    runs,
    tradesPerRun,
    riskFraction,
    seed,
    startingEquity,
    probDrawdown20: (dd20Count / runs) * 100,
    probDrawdown30: (dd30Count / runs) * 100,
    probDrawdown50: (dd50Count / runs) * 100,
    medianFinalEquity: percentile(finalEquities, 50),
    p5FinalEquity: percentile(finalEquities, 5),
    label: 'simulation from your own history, not a prediction',
  };
}
