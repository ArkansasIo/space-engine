/**
 * errors.ts — application error hierarchy plus Express error handler.
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from '@config/env';
import { logger } from '@utils/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (msg: string, details?: unknown): AppError =>
  new AppError(400, 'BAD_REQUEST', msg, details);
export const unauthorized = (msg = 'Authentication required'): AppError =>
  new AppError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'You do not have access to this resource'): AppError =>
  new AppError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'Resource not found'): AppError =>
  new AppError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string): AppError => new AppError(409, 'CONFLICT', msg);
export const tooMany = (msg = 'Too many requests'): AppError =>
  new AppError(429, 'RATE_LIMITED', msg);
export const internal = (msg = 'Internal server error'): AppError =>
  new AppError(500, 'INTERNAL', msg);

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Terminal 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/** Central error middleware. Must be registered last. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const appErr =
    err instanceof AppError
      ? err
      : new AppError(500, 'INTERNAL', err instanceof Error ? err.message : 'Unknown error');

  if (appErr.statusCode >= 500) {
    logger.error(appErr.message, err instanceof Error ? err.stack : err);
  } else if (env.isDev) {
    logger.debug(`${appErr.statusCode} ${appErr.code}: ${appErr.message}`);
  }

  const body: ErrorBody = {
    error: {
      code: appErr.code,
      message: appErr.message
    }
  };
  if (appErr.details !== undefined) body.error.details = appErr.details;

  res.status(appErr.statusCode).json(body);
}
