/**
 * experimentService.ts — quantitative run records.
 */
import { EVENT_TYPES } from '@config/constants';
import * as experimentModel from '@models/experimentModel';
import * as simulationModel from '@models/simulationModel';
import { badRequest, notFound } from '@utils/errors';
import * as eventService from '@services/eventService';
import type { Experiment } from '@/types';
import type { AuditContext } from '@services/eventService';

export interface CreateInput {
  userId: number;
  simulationId?: number | null;
  label: string;
  integralValue?: number | null;
  derivativeAt?: number | null;
  energyDrift?: number | null;
  samples?: number;
  result?: unknown;
}

export async function create(input: CreateInput, ctx: AuditContext = {}): Promise<Experiment> {
  if (input.simulationId != null) {
    const sim = await simulationModel.findById(input.simulationId);
    if (!sim) throw notFound('Referenced simulation does not exist');
  }
  const label = input.label.trim();
  if (!label) throw badRequest('Experiment label is required');

  const experiment = await experimentModel.create({ ...input, label });

  await eventService.record(ctx, {
    userId: input.userId,
    eventType: EVENT_TYPES.EXP_CREATE,
    entity: 'experiment',
    entityId: experiment.id,
    detail: { simulationId: experiment.simulationId }
  });

  return experiment;
}

export function listForUser(userId: number, page: number, pageSize: number): Promise<Experiment[]> {
  return experimentModel.listForUser(userId, pageSize, (page - 1) * pageSize);
}

export function listForSimulation(simulationId: number): Promise<Experiment[]> {
  return experimentModel.listForSimulation(simulationId);
}

export async function remove(
  id: number,
  userId: number,
  role: 'user' | 'admin',
  ctx: AuditContext = {}
): Promise<void> {
  const experiment = await experimentModel.findById(id);
  if (!experiment) throw notFound('Experiment not found');
  if (role !== 'admin' && experiment.userId !== userId) {
    throw notFound('Experiment not found');
  }
  await experimentModel.remove(id);
  await eventService.record(ctx, {
    userId,
    eventType: EVENT_TYPES.EXP_DELETE,
    entity: 'experiment',
    entityId: id
  });
}

export function countForUser(userId: number): Promise<number> {
  return experimentModel.countForUser(userId);
}
