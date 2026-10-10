/**
 * bodyRoutes.ts — /api/bodies
 */
import { Router } from 'express';
import * as bodyController from '@controllers/bodyController';

const router = Router();

router.get('/histogram', bodyController.histogram);
router.get('/kind/:kind', bodyController.byKind);

export default router;
