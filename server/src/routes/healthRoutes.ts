/**
 * healthRoutes.ts — /api/health
 */
import { Router } from 'express';
import * as healthController from '@controllers/healthController';

const router = Router();

router.get('/', healthController.ready);
router.get('/live', healthController.live);
router.get('/ready', healthController.ready);

export default router;
