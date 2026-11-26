import LedgerEntry from '../models/LedgerEntry.js';
import ApiError from '../utils/ApiError.js';
import { EPS } from '../risk/constants.js';
import { getOwnerFields, scopeQuery } from '../utils/scopeQuery.js';
import { getPortfolioSummary } from './portfolio.service.js';
import { logAudit } from './audit.service.js';

export async function listLedgerEntries(auth) {
  return LedgerEntry.find(scopeQuery(auth)).sort({ date: -1, createdAt: -1 }).lean();
}

export async function createLedgerEntry(auth, { type, amount, date, note = '' }) {
  if (type === 'WITHDRAWAL') {
    const summary = await getPortfolioSummary(auth);
    if (amount > summary.availableMargin + EPS) {
      throw new ApiError(
        400,
        `Withdrawal ($${amount.toFixed(2)}) exceeds available margin ($${summary.availableMargin.toFixed(2)})`
      );
    }
  }

  const created = await LedgerEntry.create({
    ...getOwnerFields(auth),
    type,
    amount,
    date: date ? new Date(date) : new Date(),
    note,
  });

  await logAudit(auth, {
    action: 'LEDGER_ENTRY',
    entity: 'LedgerEntry',
    entityId: created._id,
    after: created.toObject(),
    reason: note,
  });

  return created.toObject();
}
