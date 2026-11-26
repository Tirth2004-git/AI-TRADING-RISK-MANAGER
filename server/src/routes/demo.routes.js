import { Router } from 'express';
import { requireAuth, requireRegisteredUser } from '../middleware/auth.js';
import {
  deleteReset,
  getStatus,
  postGenerate,
} from '../controllers/demo.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/status', getStatus);
router.post('/generate', requireRegisteredUser, postGenerate);
router.delete('/reset', requireRegisteredUser, deleteReset);

export default router;
