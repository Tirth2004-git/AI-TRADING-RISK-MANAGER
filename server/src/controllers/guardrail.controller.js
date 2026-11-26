import { sendSuccess } from '../utils/apiResponse.js';
import { getGuardrailStatus } from '../services/guardrail.service.js';

export async function getStatus(req, res) {
  const status = await getGuardrailStatus(req.auth);
  return sendSuccess(res, status);
}
