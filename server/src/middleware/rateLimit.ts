/**
 * rateLimit.ts — request throttling for the whole API and for auth routes.
 */
import rateLimit from 'express-rate-limit';
import { env } from '@config/env';

export const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } }
});

/** Stricter limiter for credential endpoints. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts.' } }
});
