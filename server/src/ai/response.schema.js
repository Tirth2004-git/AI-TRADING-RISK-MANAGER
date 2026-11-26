import { z } from 'zod';
import { RISK_BANDS } from '../risk/constants.js';

export const aiResponseSchema = z.object({
  summary: z.string().trim().min(1),
  weaknesses: z.array(z.string().trim().min(1)),
  suggestions: z.array(z.string().trim().min(1)),
  verdict: z.enum(['ACCEPTABLE', 'NEEDS_CHANGES', 'TOO_RISKY']),
});

/**
 * Enforce that the AI verdict is never softer than the deterministic risk band.
 */
export function enforceVerdictFloor(response, riskBand) {
  let verdict = response.verdict;

  if (riskBand === RISK_BANDS.CRITICAL) {
    verdict = 'TOO_RISKY';
  } else if (riskBand === RISK_BANDS.HIGH && verdict === 'ACCEPTABLE') {
    verdict = 'NEEDS_CHANGES';
  }

  return {
    ...response,
    verdict,
  };
}
