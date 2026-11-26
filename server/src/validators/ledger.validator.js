import { z } from 'zod';

export const ledgerEntrySchema = z.object({
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  amount: z
    .number()
    .finite()
    .positive('Amount must be greater than 0')
    .max(1e12, 'Amount is too large'),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional().default(''),
});
