import { sendSuccess } from '../utils/apiResponse.js';
import * as stressService from '../services/stress.service.js';

export async function postStressTest(req, res) {
  const result = await stressService.executeStressTest(req.auth, req.body);
  return sendSuccess(res, result);
}

export async function postMonteCarlo(req, res) {
  const result = await stressService.executeMonteCarlo(req.auth, req.body);
  return sendSuccess(res, result);
}

export async function getAdvancedRisk(req, res) {
  const ruinThresholdPct = Number(req.query.ruinThresholdPct) || 50;
  const customKellyFraction =
    req.query.customKellyFraction !== undefined
      ? Number(req.query.customKellyFraction)
      : 0.25;
  const result = await stressService.getAdvancedRiskMetrics(req.auth, {
    ruinThresholdPct,
    customKellyFraction,
  });
  return sendSuccess(res, result);
}

export async function postCorrelation(req, res) {
  const result = stressService.computeCorrelation(req.body);
  return sendSuccess(res, result);
}
