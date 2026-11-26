import { sendSuccess } from '../utils/apiResponse.js';
import * as portfolioService from '../services/portfolio.service.js';

export async function getSummary(req, res) {
  const summary = await portfolioService.getPortfolioSummary(req.auth);
  return sendSuccess(res, summary);
}

export async function getPerformance(req, res) {
  const performance = await portfolioService.getPortfolioPerformance(req.auth);
  return sendSuccess(res, performance);
}
