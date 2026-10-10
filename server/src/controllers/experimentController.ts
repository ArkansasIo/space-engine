/**
 * experimentController.ts — HTTP layer for quantitative runs.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as experimentService from '@services/experimentService';
import { ok, created, noContent, pagination } from '@utils/response';
import { unauthorized } from '@utils/errors';
import { auditContext } from '@controllers/helpers';

export const createSchema = z.object({
  simulationId: z.number().int().positive().nullish(),
  label: z.string().min(1).max(120),
  integralValue: z.number().nullish(),
  derivativeAt: z.number().nullish(),
  energyDrift: z.number().nullish(),
  samples: z.number().int().min(0).optional(),
  result: z.unknown().optional()
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const exp = await experimentService.create(
      { ...req.body, userId: req.user.id },
      auditContext(req)
    );
    created(res, exp);
  } catch (err) {
    next(err);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const q = req.query as unknown as z.infer<typeof listQuerySchema>;
    const items = await experimentService.listForUser(req.user.id, q.page, q.pageSize);
    ok(res, items, pagination(q.page, q.pageSize, items.length));
  } catch (err) {
    next(err);
  }
}

export async function listForSimulation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    ok(res, await experimentService.listForSimulation(Number(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    await experimentService.remove(
      Number(req.params.id),
      req.user.id,
      req.user.role,
      auditContext(req)
    );
    noContent(res);
  } catch (err) {
    next(err);
  }
}
