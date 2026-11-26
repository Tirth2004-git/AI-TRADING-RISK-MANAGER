import { sendSuccess } from '../utils/apiResponse.js';
import * as demoService from '../services/demo.service.js';

export async function getStatus(_req, res) {
  const status = await demoService.getDemoStatus();
  return sendSuccess(res, status);
}

export async function postGenerate(_req, res) {
  const result = await demoService.generateDemoData();
  const statusCode = result.alreadySeeded ? 200 : 201;
  return sendSuccess(res, result, statusCode);
}

export async function deleteReset(req, res) {
  const confirm =
    req.body?.confirm === true || req.query?.confirm === 'true';
  const result = await demoService.resetDemoData({ confirm });
  return sendSuccess(res, result);
}
