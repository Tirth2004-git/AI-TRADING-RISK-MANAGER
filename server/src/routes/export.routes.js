import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { heavyRouteLimiter } from '../middleware/rateLimit.js';
import { getExport } from '../controllers/export.controller.js';

const router = Router();

router.get('/', requireAuth, heavyRouteLimiter, getExport);

export default router;
