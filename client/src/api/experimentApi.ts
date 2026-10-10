/**
 * experimentApi.ts — quantitative run endpoints.
 */
import { request, requestWithMeta } from './client';
import type { Experiment, ApiMeta } from '../types';

export interface CreateExperimentInput {
  simulationId?: number | null;
  label: string;
  integralValue?: number | null;
  derivativeAt?: number | null;
  energyDrift?: number | null;
  samples?: number;
  result?: unknown;
}

export function createExperiment(input: CreateExperimentInput): Promise<Experiment> {
  return request<Experiment>('/experiments', { method: 'POST', body: input });
}

export async function listExperiments(
  page = 1,
  pageSize = 50
): Promise<{ items: Experiment[]; meta?: ApiMeta }> {
  const envelope = await requestWithMeta<Experiment[]>('/experiments', { query: { page, pageSize } });
  return { items: envelope.data, meta: envelope.meta };
}

export function listForSimulation(simulationId: number): Promise<Experiment[]> {
  return request<Experiment[]>(`/experiments/simulation/${simulationId}`);
}

export function deleteExperiment(id: number): Promise<void> {
  return request<void>(`/experiments/${id}`, { method: 'DELETE' });
}
