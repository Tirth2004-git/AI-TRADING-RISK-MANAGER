import { sendSuccess } from '../utils/apiResponse.js';
import * as settingsService from '../services/settings.service.js';

export async function getSettings(req, res) {
  const settings = await settingsService.getSettings(req.auth);
  return sendSuccess(res, settings);
}

export async function updateSettings(req, res) {
  const settings = await settingsService.updateSettings(req.auth, req.body);
  return sendSuccess(res, settings);
}
