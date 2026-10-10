/**
 * validate.ts — zod schema validation middleware.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema, type ZodTypeAny } from 'zod';
import { badRequest } from '@utils/errors';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatIssues(err: ZodError): Array<{ path: string; message: string }> {
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message
  }));
}

/** Validate and replace req.body/query/params with the parsed result. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
      if (schemas.query) req.query = schemas.query.parse(req.query) as Request['query'];
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(badRequest('Validation failed', formatIssues(err)));
      } else {
        next(err);
      }
    }
  };
}

/** Validate a plain value against a schema, throwing a 400 on failure. */
export function parseOrThrow<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    if (err instanceof ZodError) throw badRequest('Validation failed', formatIssues(err));
    throw err;
  }
}
