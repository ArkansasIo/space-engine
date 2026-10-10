/**
 * bodyController.ts — HTTP layer for cross-simulation body queries.
 */
import type { Request, Response, NextFunction } from 'express';
import * as bodyService from '@services/bodyService';
import { ok } from '@utils/response';

export async function byKind(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const kind = String(req.params.kind);
    const limit = Number(req.query.limit ?? 100);
    ok(res, await bodyService.listByKind(kind, Number.isFinite(limit) ? limit : 100));
  } catch (err) {
    next(err);
  }
}

export async function histogram(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ok(res, await bodyService.histogram());
  } catch (err) {
    next(err);
  }
}
