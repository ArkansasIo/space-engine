/**
 * authRoutes.ts — /api/auth
 */
import { Router } from 'express';
import * as authController from '@controllers/authController';
import { validate } from '@middleware/validate';
import { requireAuth } from '@middleware/auth';
import { authLimiter } from '@middleware/rateLimit';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate({ body: authController.registerSchema }),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate({ body: authController.loginSchema }),
  authController.login
);

router.post('/logout', requireAuth, authController.logout);

router.get('/me', requireAuth, authController.me);

export default router;
