import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getStatus } from '../controllers/guardrail.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/status', getStatus);

export default router;
