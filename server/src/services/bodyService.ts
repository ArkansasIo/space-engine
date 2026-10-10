/**
 * bodyService.ts — normalised body queries.
 */
import * as bodyModel from '@models/bodyModel';
import { BODY_KINDS } from '@config/constants';
import { badRequest } from '@utils/errors';
import type { Body, BodySpec } from '@/types';

export function listForSimulation(simulationId: number): Promise<Body[]> {
  return bodyModel.listForSimulation(simulationId);
}

export function listByKind(kind: string, limit = 100): Promise<Body[]> {
  if (!BODY_KINDS.includes(kind as (typeof BODY_KINDS)[number])) {
    throw badRequest(`Unknown body kind: ${kind}`);
  }
  return bodyModel.listByKind(kind as BodySpec['kind'], limit);
}

export function histogram() {
  return bodyModel.kindHistogram();
}

export function heaviest(simulationId: number, limit = 10): Promise<Body[]> {
  return bodyModel.heaviest(simulationId, limit);
}
