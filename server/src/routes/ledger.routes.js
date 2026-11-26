import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { ledgerEntrySchema } from '../validators/ledger.validator.js';
import { createLedger, listLedger } from '../controllers/ledger.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', listLedger);
router.post('/', requireRegisteredUser, validate(ledgerEntrySchema), createLedger);

export default router;
