import { sendSuccess } from '../utils/apiResponse.js';
import { exportAllData } from '../services/export.service.js';

export async function getExport(req, res) {
  const data = await exportAllData(req.auth);
  return sendSuccess(res, data);
}
