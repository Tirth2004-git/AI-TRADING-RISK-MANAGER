export const EPS = 1e-9;

export const TRADE_SIDES = Object.freeze({
  LONG: 'LONG',
  SHORT: 'SHORT',
});

export const TRADE_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
});

export const RISK_BANDS = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
});

export const DEFAULT_DRAWDOWN_TIERS = Object.freeze([
  { minDrawdownPct: 0, maxDrawdownPct: 5, multiplier: 1 },
  { minDrawdownPct: 5, maxDrawdownPct: 10, multiplier: 0.5 },
  { minDrawdownPct: 10, maxDrawdownPct: 100, multiplier: 0.25 },
]);

export const DEFAULT_SETTINGS = Object.freeze({
  startingBalance: 10000,
  riskPerTradePct: 1,
  maxLeverage: 10,
  minRiskReward: 1.5,
  maxOpenRiskPct: 5,
  maxDrawdownPct: 10,
  maxDailyLossPct: 3,
  maintenanceMarginPct: 0.5,
  takerFeePct: 0.05,
  slippagePct: 0.05,
  defaultFundingRatePct: 0.01,
  maxWeeklyLossPct: 7,
  maxTradesPerDay: 5,
  cooldownMinutes: 60,
  cooldownAfterLosses: 3,
  maxGroupRiskPct: 3,
  drawdownTiers: DEFAULT_DRAWDOWN_TIERS,
});

export const MAX_LEVERAGE_HARD_CAP = 125;
export const MIN_LEVERAGE = 1;
