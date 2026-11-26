import { z } from 'zod';

const MAX_FINANCIAL_VALUE = 1e12;

const optionalPositiveNumber = z
  .number()
  .finite()
  .positive()
  .max(MAX_FINANCIAL_VALUE, 'Value is too large')
  .nullable()
  .optional();

export const tradeInputSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,15}$/, 'Symbol must be 2 to 15 uppercase letters or digits'),
  side: z.enum(['LONG', 'SHORT']),
  entry: z
    .number()
    .finite()
    .positive('Entry price must be greater than 0')
    .max(MAX_FINANCIAL_VALUE, 'Entry price is too large'),
  stopLoss: optionalPositiveNumber,
  target: optionalPositiveNumber,
  leverage: z
    .number()
    .finite()
    .min(1, 'Leverage must be at least 1')
    .max(125, 'Leverage cannot exceed 125'),
  quantity: optionalPositiveNumber,
  fundingRatePct: z.number().finite().min(-5).max(5).nullable().optional(),
  fundingIntervals: z.number().finite().min(0).max(1000).optional().default(0),
  notes: z.string().max(2000).optional().default(''),
  acknowledged: z.boolean().optional().default(false),
  overrideReason: z.string().trim().max(500).optional().default(''),
});

export const closeTradeSchema = z.object({
  exitPrice: z.number().finite().positive('Exit price must be greater than 0'),
  fees: z.number().finite().min(0, 'Fees must be 0 or greater').optional().default(0),
  fundingPaid: z.number().finite().optional().default(0),
});

export const exitTradeSchema = z.object({
  quantity: z.number().finite().positive('Exit quantity must be greater than 0'),
  price: z.number().finite().positive('Exit price must be greater than 0'),
  fee: z.number().finite().min(0, 'Exit fee must be 0 or greater').optional().default(0),
  fundingPaid: z.number().finite().optional().default(0),
});

export const moveStopSchema = z.object({
  stopLoss: z.number().finite().positive('Stop-loss must be greater than 0'),
  reason: z.string().trim().max(500).optional().default(''),
});

export const markPriceSchema = z.object({
  markPrice: z.number().finite().positive('Mark price must be greater than 0'),
});

export const journalSchema = z.object({
  setupTag: z.string().trim().max(50).optional().default(''),
  emotionTag: z.string().trim().max(50).optional().default(''),
  followedPlan: z.boolean().nullable().optional().default(null),
  lesson: z.string().trim().max(1000).optional().default(''),
});
