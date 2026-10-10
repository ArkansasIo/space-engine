/**
 * index.ts — mounts every feature router under /api.
 */
import { Router } from 'express';
import authRoutes from '@routes/authRoutes';
import simulationRoutes from '@routes/simulationRoutes';
import presetRoutes from '@routes/presetRoutes';
import experimentRoutes from '@routes/experimentRoutes';
import bodyRoutes from '@routes/bodyRoutes';
import healthRoutes from '@routes/healthRoutes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/simulations', simulationRoutes);
router.use('/presets', presetRoutes);
router.use('/experiments', experimentRoutes);
router.use('/bodies', bodyRoutes);

export default router;
