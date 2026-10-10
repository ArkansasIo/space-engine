/**
 * simulationService.ts — scene persistence, ownership and play counting.
 */
import { env } from '@config/env';
import { EVENT_TYPES } from '@config/constants';
import * as simulationModel from '@models/simulationModel';
import { badRequest, forbidden, notFound, conflict } from '@utils/errors';
import * as eventService from '@services/eventService';
import { validateScene } from '@services/sceneValidator';
import type { Simulation, Page } from '@/types';
import type { AuditContext } from '@services/eventService';

export interface CreateInput {
  userId: number;
  name: string;
  description?: string | null;
  presetKey?: string | null;
  seed?: number | null;
  settings: unknown;
  isPublic?: boolean;
}

export async function create(input: CreateInput, ctx: AuditContext = {}): Promise<Simulation> {
  const existing = await simulationModel.countForUser(input.userId);
  if (existing >= env.maxSimulationsPerUser) {
    throw conflict(
      `Simulation limit reached (${env.maxSimulationsPerUser}). Delete one before creating another.`
    );
  }

  const settings = validateScene(input.settings);
  const sim = await simulationModel.create({
    userId: input.userId,
    name: input.name.trim(),
    description: input.description ?? null,
    presetKey: input.presetKey ?? null,
    seed: input.seed ?? null,
    settings,
    isPublic: input.isPublic ?? false
  });

  await eventService.record(ctx, {
    userId: input.userId,
    eventType: EVENT_TYPES.SIM_CREATE,
    entity: 'simulation',
    entityId: sim.id,
    detail: { bodyCount: sim.bodyCount, presetKey: sim.presetKey }
  });

  return sim;
}

export async function get(id: number): Promise<Simulation> {
  const sim = await simulationModel.findById(id);
  if (!sim) throw notFound('Simulation not found');
  return sim;
}

export interface ListQuery {
  userId?: number;
  onlyPublic?: boolean;
  includeArchived?: boolean;
  search?: string;
  presetKey?: string;
  page: number;
  pageSize: number;
}

export async function list(query: ListQuery): Promise<Page<Simulation>> {
  const offset = (query.page - 1) * query.pageSize;
  const { items, total } = await simulationModel.list({
    userId: query.userId,
    onlyPublic: query.onlyPublic,
    includeArchived: query.includeArchived,
    search: query.search,
    presetKey: query.presetKey,
    limit: query.pageSize,
    offset
  });
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0
  };
}

/** Load a simulation applying visibility rules for the requesting user. */
export async function getVisible(
  id: number,
  viewerId: number | null,
  viewerRole: 'user' | 'admin' | null
): Promise<Simulation> {
  const sim = await get(id);
  const isOwner = viewerId !== null && sim.userId === viewerId;
  const isAdmin = viewerRole === 'admin';
  if (!sim.isPublic && !isOwner && !isAdmin) {
    throw forbidden('This simulation is private');
  }
  return sim;
}

export interface UpdateInput {
  name?: string;
  description?: string | null;
  settings?: unknown;
  isPublic?: boolean;
  isArchived?: boolean;
  presetKey?: string | null;
}

export async function update(
  id: number,
  actorId: number,
  actorRole: 'user' | 'admin',
  input: UpdateInput,
  ctx: AuditContext = {}
): Promise<Simulation> {
  const sim = await get(id);
  assertCanMutate(sim, actorId, actorRole);

  const patch: simulationModel.UpdateSimulationInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw badRequest('Name cannot be empty');
    patch.name = name;
  }
  if (input.description !== undefined) patch.description = input.description;
  if (input.presetKey !== undefined) patch.presetKey = input.presetKey;
  if (input.isPublic !== undefined) patch.isPublic = input.isPublic;
  if (input.isArchived !== undefined) patch.isArchived = input.isArchived;
  if (input.settings !== undefined) patch.settings = validateScene(input.settings);

  const updated = await simulationModel.update(id, patch);

  await eventService.record(ctx, {
    userId: actorId,
    eventType: EVENT_TYPES.SIM_UPDATE,
    entity: 'simulation',
    entityId: id,
    detail: { fields: Object.keys(patch) }
  });

  return updated;
}

export async function remove(
  id: number,
  actorId: number,
  actorRole: 'user' | 'admin',
  ctx: AuditContext = {}
): Promise<void> {
  const sim = await get(id);
  assertCanMutate(sim, actorId, actorRole);
  await simulationModel.remove(id);
  await eventService.record(ctx, {
    userId: actorId,
    eventType: EVENT_TYPES.SIM_DELETE,
    entity: 'simulation',
    entityId: id
  });
}

/** Record a "play" — bumps the counter and logs telemetry. */
export async function play(
  id: number,
  viewerId: number | null,
  viewerRole: 'user' | 'admin' | null,
  ctx: AuditContext = {}
): Promise<Simulation> {
  const sim = await getVisible(id, viewerId, viewerRole);
  await simulationModel.incrementPlayCount(id);
  await eventService.record(ctx, {
    userId: viewerId,
    eventType: EVENT_TYPES.SIM_PLAY,
    entity: 'simulation',
    entityId: id
  });
  return { ...sim, playCount: sim.playCount + 1 };
}

function assertCanMutate(
  sim: Simulation,
  actorId: number,
  actorRole: 'user' | 'admin'
): void {
  if (actorRole === 'admin') return;
  if (sim.userId !== actorId) throw forbidden('You can only modify your own simulations');
}
