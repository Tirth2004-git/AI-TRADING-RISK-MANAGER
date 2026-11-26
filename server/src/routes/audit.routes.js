import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAuditLogs } from '../controllers/audit.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', getAuditLogs);

export default router;
