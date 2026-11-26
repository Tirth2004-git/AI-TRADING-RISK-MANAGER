import { sendSuccess } from '../utils/apiResponse.js';
import * as auditService from '../services/audit.service.js';

export async function getAuditLogs(req, res) {
  const result = await auditService.listAuditLogs(req.auth, {
    page: req.query.page,
    limit: req.query.limit,
  });
  return sendSuccess(res, result);
}
