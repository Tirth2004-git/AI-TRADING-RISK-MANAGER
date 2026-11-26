import { z } from 'zod';

export const stressTestSchema = z.object({
  mode: z.enum(['STOPS_WORK', 'GAP']).optional().default('STOPS_WORK'),
  customShockPct: z.number().finite().min(-99).max(500).nullable().optional(),
});

export const monteCarloSchema = z.object({
  runs: z.number().int().min(100).max(20000).optional().default(10000),
  tradesPerRun: z.number().int().min(10).max(500).optional().default(100),
  seed: z.number().int().optional().default(42),
});

export const correlationSchema = z.object({
  series: z.record(z.string(), z.array(z.number().finite().positive())).optional().default({}),
});
