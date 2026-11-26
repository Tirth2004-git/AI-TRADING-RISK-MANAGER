import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPerformance, getSummary } from '../controllers/portfolio.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', getSummary);
router.get('/performance', getPerformance);

export default router;
