/**
 * simulationController.ts — HTTP layer for saved scenes.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as simulationService from '@services/simulationService';
import * as bodyService from '@services/bodyService';
import { ok, created, noContent, pagination } from '@utils/response';
import { unauthorized } from '@utils/errors';
import { auditContext } from '@controllers/helpers';

const bodySpecSchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(['star', 'planet', 'blackhole', 'neutron', 'dust', 'ship']),
  mass: z.number(),
  radius: z.number(),
  x: z.number(),
  y: z.number(),
  vx: z.number(),
  vy: z.number(),
  color: z.string(),
  temperature: z.number().optional(),
  luminosity: z.number().optional(),
  spin: z.number().optional(),
  fixed: z.boolean().optional(),
  trailLength: z.number().optional()
});

const sceneSchema = z.object({
  bodies: z.array(bodySpecSchema).max(2000),
  gravity: z.object({
    G: z.number(),
    softening: z.number(),
    relativistic: z.boolean()
  }),
  camera: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number()
  })
});

export const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  presetKey: z.string().max(60).nullish(),
  seed: z.number().int().nullish(),
  settings: sceneSchema,
  isPublic: z.boolean().optional()
});

export const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullish(),
  presetKey: z.string().max(60).nullish(),
  settings: sceneSchema.optional(),
  isPublic: z.boolean().optional(),
  isArchived: z.boolean().optional()
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  mine: z.coerce.boolean().optional(),
  public: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  search: z.string().max(120).optional(),
  presetKey: z.string().max(60).optional()
});

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const sim = await simulationService.create(
      { ...req.body, userId: req.user.id },
      auditContext(req)
    );
    created(res, sim);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query as unknown as z.infer<typeof listQuerySchema>;
    const page = await simulationService.list({
      userId: q.mine ? req.user?.id : undefined,
      onlyPublic: q.public,
      includeArchived: q.archived,
      search: q.search,
      presetKey: q.presetKey,
      page: q.page,
      pageSize: q.pageSize
    });
    ok(res, page.items, pagination(page.page, page.pageSize, page.total));
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const sim = await simulationService.getVisible(id, req.user?.id ?? null, req.user?.role ?? null);
    ok(res, sim);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    const id = Number(req.params.id);
    const sim = await simulationService.update(
      id,
      req.user.id,
      req.user.role,
      req.body,
      auditContext(req)
    );
    ok(res, sim);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw unauthorized();
    await simulationService.remove(
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

export async function play(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sim = await simulationService.play(
      Number(req.params.id),
      req.user?.id ?? null,
      req.user?.role ?? null,
      auditContext(req)
    );
    ok(res, sim);
  } catch (err) {
    next(err);
  }
}

export async function bodies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    // Reuse visibility check so private scenes are not enumerable.
    await simulationService.getVisible(id, req.user?.id ?? null, req.user?.role ?? null);
    ok(res, await bodyService.listForSimulation(id));
  } catch (err) {
    next(err);
  }
}
