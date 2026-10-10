/**
 * simulationApi.ts — saved-scene endpoints.
 */
import { request, requestWithMeta } from './client';
import type { Simulation, SceneSettings, ApiMeta, BodyDto } from '../types';

export interface ListSimulationsQuery {
  [key: string]: string | number | boolean | null | undefined;
  page?: number;
  pageSize?: number;
  mine?: boolean;
  public?: boolean;
  archived?: boolean;
  search?: string;
  presetKey?: string;
}

export async function listSimulations(
  query: ListSimulationsQuery = {}
): Promise<{ items: Simulation[]; meta?: ApiMeta }> {
  const envelope = await requestWithMeta<Simulation[]>('/simulations', { query });
  return { items: envelope.data, meta: envelope.meta };
}

export function getSimulation(id: number): Promise<Simulation> {
  return request<Simulation>(`/simulations/${id}`);
}

export interface CreateSimulationInput {
  name: string;
  description?: string | null;
  presetKey?: string | null;
  seed?: number | null;
  settings: SceneSettings;
  isPublic?: boolean;
}

export function createSimulation(input: CreateSimulationInput): Promise<Simulation> {
  return request<Simulation>('/simulations', { method: 'POST', body: input });
}

export interface UpdateSimulationInput {
  name?: string;
  description?: string | null;
  settings?: SceneSettings;
  isPublic?: boolean;
  isArchived?: boolean;
  presetKey?: string | null;
}

export function updateSimulation(id: number, input: UpdateSimulationInput): Promise<Simulation> {
  return request<Simulation>(`/simulations/${id}`, { method: 'PATCH', body: input });
}

export function deleteSimulation(id: number): Promise<void> {
  return request<void>(`/simulations/${id}`, { method: 'DELETE' });
}

export function playSimulation(id: number): Promise<Simulation> {
  return request<Simulation>(`/simulations/${id}/play`, { method: 'POST' });
}

export function listBodies(simulationId: number): Promise<BodyDto[]> {
  return request<BodyDto[]>(`/simulations/${simulationId}/bodies`);
}
