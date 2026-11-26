import { z } from 'zod';

const optionalPositiveNumber = z
  .number()
  .finite()
  .positive()
  .nullable()
  .optional();

export const tradeReviewSchema = z.union([
  z.object({
    tradeId: z.string().trim().min(1, 'tradeId is required'),
  }),
  z.object({
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,15}$/, 'Symbol must be 2 to 15 uppercase letters or digits'),
    side: z.enum(['LONG', 'SHORT']),
    entry: z.number().finite().positive('Entry price must be greater than 0'),
    stopLoss: optionalPositiveNumber,
    target: optionalPositiveNumber,
    leverage: z
      .number()
      .finite()
      .min(1, 'Leverage must be at least 1')
      .max(125, 'Leverage cannot exceed 125'),
    quantity: optionalPositiveNumber,
  }),
]);
