/**
 * experimentRoutes.ts — /api/experiments
 */
import { Router } from 'express';
import * as experimentController from '@controllers/experimentController';
import { validate } from '@middleware/validate';
import { requireAuth, optionalAuth } from '@middleware/auth';

const router = Router();

router.get(
  '/',
  requireAuth,
  validate({ query: experimentController.listQuerySchema }),
  experimentController.listMine
);

router.post(
  '/',
  requireAuth,
  validate({ body: experimentController.createSchema }),
  experimentController.create
);

router.get('/simulation/:id', optionalAuth, experimentController.listForSimulation);

router.delete('/:id', requireAuth, experimentController.remove);

export default router;
