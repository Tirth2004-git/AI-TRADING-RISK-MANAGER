import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { heavyRouteLimiter } from '../middleware/rateLimit.js';
import {
  correlationSchema,
  monteCarloSchema,
  stressTestSchema,
} from '../validators/stress.validator.js';
import {
  getAdvancedRisk,
  postCorrelation,
  postMonteCarlo,
  postStressTest,
} from '../controllers/stress.controller.js';

const router = Router();

router.use(requireAuth);
router.use(heavyRouteLimiter);
router.get('/advanced', getAdvancedRisk);
router.post('/stress', validate(stressTestSchema), postStressTest);
router.post('/montecarlo', validate(monteCarloSchema), postMonteCarlo);
router.post('/correlation', validate(correlationSchema), postCorrelation);

export default router;
