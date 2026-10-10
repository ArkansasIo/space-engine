/**
 * auth.ts — JWT bearer authentication and role guards.
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@utils/jwt';
import { unauthorized, forbidden } from '@utils/errors';
import type { UserRole } from '@config/constants';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookie && typeof cookie.token === 'string') return cookie.token;
  return null;
}

/** Attach req.user when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
  } catch {
    // Ignore invalid tokens on optional routes.
  }
  next();
}

/** Require a valid token. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Require one of the given roles (implies authentication). */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    requireAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (!req.user || !roles.includes(req.user.role)) {
        return next(forbidden('Insufficient privileges'));
      }
      next();
    });
  };
}

/** Convenience: the authenticated user or undefined. */
export function currentUser(req: Request): AuthUser | undefined {
  return req.user;
}
