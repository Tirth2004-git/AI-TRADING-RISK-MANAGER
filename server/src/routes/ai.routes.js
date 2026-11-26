import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rateLimit.js';
import { tradeReviewSchema } from '../validators/ai.validator.js';
import {
  postPortfolioReview,
  postTradeReview,
  postWeeklyReview,
} from '../controllers/ai.controller.js';

const router = Router();

router.use(requireAuth);
router.use(aiRateLimiter);
router.post('/trade-review', validate(tradeReviewSchema), postTradeReview);
router.post('/portfolio-review', postPortfolioReview);
router.post('/weekly-review', postWeeklyReview);

export default router;
