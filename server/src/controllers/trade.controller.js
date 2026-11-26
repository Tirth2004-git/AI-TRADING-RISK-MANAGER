import { sendSuccess } from '../utils/apiResponse.js';
import * as tradeService from '../services/trade.service.js';

export async function analyzeTrade(req, res) {
  const result = await tradeService.analyzeTrade(req.auth, req.body);
  return sendSuccess(res, result);
}

export async function createTrade(req, res) {
  const trade = await tradeService.createTrade(req.auth, req.body);
  return sendSuccess(res, trade, 201);
}

export async function listTrades(req, res) {
  const trades = await tradeService.listTrades(req.auth, {
    status: req.query.status,
    symbol: req.query.symbol,
    result: req.query.result,
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  });
  return sendSuccess(res, trades);
}

export async function getTrade(req, res) {
  const trade = await tradeService.getTradeById(req.auth, req.params.id);
  return sendSuccess(res, trade);
}

export async function updateTrade(req, res) {
  const trade = await tradeService.updateTrade(req.auth, req.params.id, req.body);
  return sendSuccess(res, trade);
}

export async function deleteTrade(req, res) {
  const trade = await tradeService.deleteTrade(req.auth, req.params.id);
  return sendSuccess(res, trade);
}

export async function addExit(req, res) {
  const trade = await tradeService.addExit(req.auth, req.params.id, req.body);
  return sendSuccess(res, trade);
}

export async function closeTrade(req, res) {
  const trade = await tradeService.closeTrade(req.auth, req.params.id, req.body);
  return sendSuccess(res, trade);
}

export async function moveStop(req, res) {
  const trade = await tradeService.moveStop(req.auth, req.params.id, req.body);
  return sendSuccess(res, trade);
}

export async function updateMarkPrice(req, res) {
  const trade = await tradeService.updateMarkPrice(req.auth, req.params.id, req.body);
  return sendSuccess(res, trade);
}

export async function updateJournal(req, res) {
  const trade = await tradeService.updateJournal(req.auth, req.params.id, req.body);
  return sendSuccess(res, trade);
}

export async function cancelTrade(req, res) {
  const trade = await tradeService.cancelTrade(req.auth, req.params.id);
  return sendSuccess(res, trade);
}
