import AuditLog from '../models/AuditLog.js';
import { getOwnerFields, scopeQuery } from '../utils/scopeQuery.js';

export async function logAudit(
  auth,
  { action, entity, entityId = null, before = null, after = null, reason = '' }
) {
  return AuditLog.create({
    ...getOwnerFields(auth),
    action,
    entity,
    entityId: entityId ? String(entityId) : null,
    before,
    after,
    reason,
    time: new Date(),
  });
}

export async function listAuditLogs(auth, options = {}) {
  const filter = scopeQuery(auth);
  const hasPagination =
    options.page !== undefined || options.limit !== undefined;

  if (!hasPagination) {
    return AuditLog.find(filter).sort({ time: -1 }).limit(100).lean();
  }

  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, totalRecords] = await Promise.all([
    AuditLog.find(filter).sort({ time: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  return {
    items,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
}
