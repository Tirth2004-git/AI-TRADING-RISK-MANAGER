import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import validateObjectId from '../middleware/validateObjectId.js';
import {
  closeTradeSchema,
  exitTradeSchema,
  journalSchema,
  markPriceSchema,
  moveStopSchema,
  tradeInputSchema,
} from '../validators/trade.validator.js';
import {
  addExit,
  analyzeTrade,
  cancelTrade,
  closeTrade,
  createTrade,
  deleteTrade,
  getTrade,
  listTrades,
  moveStop,
  updateJournal,
  updateMarkPrice,
  updateTrade,
} from '../controllers/trade.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/analyze', validate(tradeInputSchema), analyzeTrade);
router.get('/', listTrades);
router.post('/', requireRegisteredUser, validate(tradeInputSchema), createTrade);
router.get('/:id', validateObjectId(), getTrade);
router.put(
  '/:id',
  requireRegisteredUser,
  validateObjectId(),
  validate(tradeInputSchema),
  updateTrade
);
router.delete('/:id', requireRegisteredUser, validateObjectId(), deleteTrade);
router.post(
  '/:id/exits',
  requireRegisteredUser,
  validateObjectId(),
  validate(exitTradeSchema),
  addExit
);
router.post(
  '/:id/close',
  requireRegisteredUser,
  validateObjectId(),
  validate(closeTradeSchema),
  closeTrade
);
router.patch(
  '/:id/stop',
  requireRegisteredUser,
  validateObjectId(),
  validate(moveStopSchema),
  moveStop
);
router.patch(
  '/:id/mark',
  requireRegisteredUser,
  validateObjectId(),
  validate(markPriceSchema),
  updateMarkPrice
);
router.patch(
  '/:id/journal',
  requireRegisteredUser,
  validateObjectId(),
  validate(journalSchema),
  updateJournal
);
router.post('/:id/cancel', requireRegisteredUser, validateObjectId(), cancelTrade);

export default router;
