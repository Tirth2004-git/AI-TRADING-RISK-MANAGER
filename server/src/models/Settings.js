import mongoose from 'mongoose';
import { DEFAULT_DRAWDOWN_TIERS, DEFAULT_SETTINGS } from '../risk/constants.js';

const drawdownTierSchema = new mongoose.Schema(
  {
    minDrawdownPct: { type: Number, required: true, min: 0 },
    maxDrawdownPct: { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, min: 0.01, max: 1 },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startingBalance: { type: Number, required: true, default: DEFAULT_SETTINGS.startingBalance, min: 0.01 },
    riskPerTradePct: { type: Number, required: true, default: DEFAULT_SETTINGS.riskPerTradePct, min: 0.01, max: 100 },
    maxLeverage: { type: Number, required: true, default: DEFAULT_SETTINGS.maxLeverage, min: 1, max: 125 },
    minRiskReward: { type: Number, required: true, default: DEFAULT_SETTINGS.minRiskReward, min: 0.1 },
    maxOpenRiskPct: { type: Number, required: true, default: DEFAULT_SETTINGS.maxOpenRiskPct, min: 0.1, max: 100 },
    maxDrawdownPct: { type: Number, required: true, default: DEFAULT_SETTINGS.maxDrawdownPct, min: 0.1, max: 100 },
    maxDailyLossPct: { type: Number, required: true, default: DEFAULT_SETTINGS.maxDailyLossPct, min: 0.1, max: 100 },
    maintenanceMarginPct: { type: Number, required: true, default: DEFAULT_SETTINGS.maintenanceMarginPct, min: 0.01, max: 50 },
    takerFeePct: { type: Number, required: true, default: DEFAULT_SETTINGS.takerFeePct, min: 0, max: 10 },
    slippagePct: { type: Number, required: true, default: DEFAULT_SETTINGS.slippagePct, min: 0, max: 10 },
    defaultFundingRatePct: { type: Number, required: true, default: DEFAULT_SETTINGS.defaultFundingRatePct, min: -5, max: 5 },
    maxWeeklyLossPct: { type: Number, required: true, default: DEFAULT_SETTINGS.maxWeeklyLossPct, min: 0.1, max: 100 },
    maxTradesPerDay: { type: Number, required: true, default: DEFAULT_SETTINGS.maxTradesPerDay, min: 1, max: 500 },
    cooldownMinutes: { type: Number, required: true, default: DEFAULT_SETTINGS.cooldownMinutes, min: 0, max: 10080 },
    cooldownAfterLosses: { type: Number, required: true, default: DEFAULT_SETTINGS.cooldownAfterLosses, min: 1, max: 50 },
    maxGroupRiskPct: { type: Number, required: true, default: DEFAULT_SETTINGS.maxGroupRiskPct, min: 0.1, max: 100 },
    drawdownTiers: { type: [drawdownTierSchema], default: () => [...DEFAULT_DRAWDOWN_TIERS] },
  },
  { timestamps: true }
);

settingsSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
