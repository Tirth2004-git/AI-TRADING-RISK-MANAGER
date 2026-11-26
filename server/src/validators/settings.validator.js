import { z } from 'zod';
import { DEFAULT_DRAWDOWN_TIERS } from '../risk/constants.js';

const drawdownTierSchema = z.object({
  minDrawdownPct: z.number().finite().min(0),
  maxDrawdownPct: z.number().finite().min(0),
  multiplier: z.number().finite().min(0.01).max(1),
});

export const updateSettingsSchema = z.object({
  startingBalance: z.number().finite().positive('Starting balance must be greater than 0'),
  riskPerTradePct: z
    .number()
    .finite()
    .positive('Risk per trade % must be greater than 0')
    .max(100, 'Risk per trade % cannot exceed 100'),
  maxLeverage: z
    .number()
    .finite()
    .min(1, 'Max leverage must be at least 1')
    .max(125, 'Max leverage cannot exceed 125'),
  minRiskReward: z.number().finite().min(0.1, 'Minimum R:R must be at least 0.1'),
  maxOpenRiskPct: z
    .number()
    .finite()
    .positive('Max open risk % must be greater than 0')
    .max(100, 'Max open risk % cannot exceed 100'),
  maxDrawdownPct: z
    .number()
    .finite()
    .positive('Max drawdown % must be greater than 0')
    .max(100, 'Max drawdown % cannot exceed 100'),
  maxDailyLossPct: z
    .number()
    .finite()
    .positive('Max daily loss % must be greater than 0')
    .max(100, 'Max daily loss % cannot exceed 100'),
  maintenanceMarginPct: z
    .number()
    .finite()
    .positive('Maintenance margin % must be greater than 0')
    .max(50, 'Maintenance margin % cannot exceed 50'),
  takerFeePct: z.number().finite().min(0).max(10).optional().default(0.05),
  slippagePct: z.number().finite().min(0).max(10).optional().default(0.05),
  defaultFundingRatePct: z.number().finite().min(-5).max(5).optional().default(0.01),
  maxWeeklyLossPct: z.number().finite().positive().max(100).optional().default(7),
  maxTradesPerDay: z.number().int().min(1).max(500).optional().default(5),
  cooldownMinutes: z.number().finite().min(0).max(10080).optional().default(60),
  cooldownAfterLosses: z.number().int().min(1).max(50).optional().default(3),
  maxGroupRiskPct: z.number().finite().positive().max(100).optional().default(3),
  drawdownTiers: z
    .array(drawdownTierSchema)
    .min(1)
    .optional()
    .default(() => [...DEFAULT_DRAWDOWN_TIERS]),
});
