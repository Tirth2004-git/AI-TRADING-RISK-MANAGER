import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { symbolProfileSchema } from '../validators/symbol.validator.js';
import {
  createSymbol,
  deleteSymbol,
  listSymbols,
  updateSymbol,
} from '../controllers/symbol.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', listSymbols);
router.post('/', requireRegisteredUser, validate(symbolProfileSchema), createSymbol);
router.put(
  '/:id',
  requireRegisteredUser,
  validateObjectId(),
  validate(symbolProfileSchema),
  updateSymbol
);
router.delete('/:id', requireRegisteredUser, validateObjectId(), deleteSymbol);

export default router;
