/**
 * presetRoutes.ts — /api/presets
 */
import { Router } from 'express';
import * as presetController from '@controllers/presetController';

const router = Router();

router.get('/', presetController.list);
router.get('/:key', presetController.getByKey);

export default router;
