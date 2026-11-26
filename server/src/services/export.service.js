import Settings from '../models/Settings.js';
import SymbolProfile from '../models/SymbolProfile.js';
import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AuditLog from '../models/AuditLog.js';
import AiReview from '../models/AiReview.js';
import { scopeQuery } from '../utils/scopeQuery.js';
import { getSettings } from './settings.service.js';

export async function exportAllData(auth) {
  const filter = scopeQuery(auth);
  const [settings, symbolProfiles, trades, ledgerEntries, auditLogs, aiReviews] =
    await Promise.all([
      auth?.isDemo
        ? Promise.resolve([await getSettings(auth)])
        : Settings.find(filter).lean(),
      SymbolProfile.find(filter).lean(),
      Trade.find(filter).lean(),
      LedgerEntry.find(filter).lean(),
      AuditLog.find(filter).sort({ time: -1 }).lean(),
      AiReview.find(filter).sort({ createdAt: -1 }).lean(),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    settings,
    symbolProfiles,
    trades,
    ledgerEntries,
    auditLogs,
    aiReviews,
  };
}
