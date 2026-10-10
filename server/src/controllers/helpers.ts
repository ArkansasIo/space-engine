/**
 * helpers.ts — small shared helpers for controllers.
 */
import type { Request } from 'express';
import type { AuditContext } from '@services/eventService';

/** Pull the client IP + user agent off a request for audit logging. */
export function auditContext(req: Request): AuditContext {
  return {
    ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null
  };
}

/** Parse a numeric route parameter, throwing on garbage. */
export function intParam(raw: string | undefined, name = 'id'): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    const err = new Error(`Invalid ${name} parameter`);
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }
  return n;
}
