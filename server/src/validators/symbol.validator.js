import { z } from 'zod';

export const symbolProfileSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,15}$/, 'Symbol must be 2 to 15 uppercase letters or digits'),
  maintenanceMarginPct: z
    .number()
    .finite()
    .positive('Maintenance margin % must be greater than 0')
    .max(50, 'Maintenance margin % cannot exceed 50'),
  maxLeverage: z
    .number()
    .finite()
    .min(1, 'Max leverage must be at least 1')
    .max(125, 'Max leverage cannot exceed 125'),
  qtyStep: z.number().finite().positive().nullable().optional(),
  minNotional: z.number().finite().positive().nullable().optional(),
  correlationGroup: z.string().trim().toUpperCase().max(20).optional().default(''),
  beta: z.number().finite().min(0, 'Beta must be 0 or greater').optional().default(1),
});
