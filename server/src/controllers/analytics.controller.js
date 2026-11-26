import { sendSuccess } from '../utils/apiResponse.js';
import { getBehaviourAnalytics } from '../services/analytics.service.js';

export async function getAnalytics(req, res) {
  const data = await getBehaviourAnalytics(req.auth);
  return sendSuccess(res, data);
}
