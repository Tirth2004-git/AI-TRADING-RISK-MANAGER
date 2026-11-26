import { sendSuccess } from '../utils/apiResponse.js';
import * as symbolService from '../services/symbol.service.js';

export async function listSymbols(req, res) {
  const items = await symbolService.listSymbols(req.auth);
  return sendSuccess(res, items);
}

export async function createSymbol(req, res) {
  const created = await symbolService.createSymbol(req.auth, req.body);
  return sendSuccess(res, created, 201);
}

export async function updateSymbol(req, res) {
  const updated = await symbolService.updateSymbol(req.auth, req.params.id, req.body);
  return sendSuccess(res, updated);
}

export async function deleteSymbol(req, res) {
  const deleted = await symbolService.deleteSymbol(req.auth, req.params.id);
  return sendSuccess(res, deleted);
}
