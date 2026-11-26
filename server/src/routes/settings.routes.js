import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', getSettings);
router.put('/', requireRegisteredUser, validate(updateSettingsSchema), updateSettings);

export default router;
