import { sendSuccess } from '../utils/apiResponse.js';
import * as ledgerService from '../services/ledger.service.js';

export async function listLedger(req, res) {
  const entries = await ledgerService.listLedgerEntries(req.auth);
  return sendSuccess(res, entries);
}

export async function createLedger(req, res) {
  const created = await ledgerService.createLedgerEntry(req.auth, req.body);
  return sendSuccess(res, created, 201);
}
