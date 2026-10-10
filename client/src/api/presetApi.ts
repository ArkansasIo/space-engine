/**
 * presetApi.ts — built-in preset catalogue endpoints.
 */
import { request } from './client';
import type { PresetDto } from '../types';

export type PresetCategory = PresetDto['category'];

/** List presets, optionally filtered by category. */
export function listPresets(category?: PresetCategory): Promise<PresetDto[]> {
  return request<PresetDto[]>('/presets', { query: { category } });
}

/** Look up one preset by its stable key. */
export function getPreset(key: string): Promise<PresetDto> {
  return request<PresetDto>(`/presets/${encodeURIComponent(key)}`);
}
