/**
 * simulationRoutes.ts — /api/simulations
 */
import { Router } from 'express';
import * as simulationController from '@controllers/simulationController';
import { validate } from '@middleware/validate';
import { requireAuth, optionalAuth } from '@middleware/auth';

const router = Router();

router.get(
  '/',
  optionalAuth,
  validate({ query: simulationController.listQuerySchema }),
  simulationController.list
);

router.post(
  '/',
  requireAuth,
  validate({ body: simulationController.createSchema }),
  simulationController.create
);

router.get('/:id', optionalAuth, simulationController.getOne);

router.patch(
  '/:id',
  requireAuth,
  validate({ body: simulationController.updateSchema }),
  simulationController.update
);

router.delete('/:id', requireAuth, simulationController.remove);

router.post('/:id/play', optionalAuth, simulationController.play);

router.get('/:id/bodies', optionalAuth, simulationController.bodies);

export default router;
