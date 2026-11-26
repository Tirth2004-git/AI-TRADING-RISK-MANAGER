import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import settingsRoutes from './settings.routes.js';
import symbolRoutes from './symbol.routes.js';
import tradeRoutes from './trade.routes.js';
import portfolioRoutes from './portfolio.routes.js';
import ledgerRoutes from './ledger.routes.js';
import auditRoutes from './audit.routes.js';
import guardrailRoutes from './guardrail.routes.js';
import stressRoutes from './stress.routes.js';
import analyticsRoutes from './analytics.routes.js';
import exportRoutes from './export.routes.js';
import demoRoutes from './demo.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/settings', settingsRoutes);
router.use('/symbols', symbolRoutes);
router.use('/trades', tradeRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/ledger', ledgerRoutes);
router.use('/audit', auditRoutes);
router.use('/guardrails', guardrailRoutes);
router.use('/risk', stressRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/export', exportRoutes);
router.use('/demo', demoRoutes);
router.use('/ai', aiRoutes);

export default router;
