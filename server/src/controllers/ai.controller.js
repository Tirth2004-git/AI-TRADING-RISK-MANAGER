import { sendSuccess } from '../utils/apiResponse.js';
import * as aiService from '../services/ai.service.js';

export async function postTradeReview(req, res) {
  const review = await aiService.reviewTrade(req.auth, req.body);
  return sendSuccess(res, review);
}

export async function postPortfolioReview(req, res) {
  const review = await aiService.reviewPortfolio(req.auth);
  return sendSuccess(res, review);
}

export async function postWeeklyReview(req, res) {
  const review = await aiService.reviewWeekly(req.auth);
  return sendSuccess(res, review);
}
