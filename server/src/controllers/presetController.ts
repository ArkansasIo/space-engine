/**
 * presetController.ts — HTTP layer for the preset catalogue.
 */
import type { Request, Response, NextFunction } from 'express';
import * as presetService from '@services/presetService';
import { ok } from '@utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    ok(res, await presetService.list(category));
  } catch (err) {
    next(err);
  }
}

export async function getByKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    ok(res, await presetService.getByKey(String(req.params.key)));
  } catch (err) {
    next(err);
  }
}
