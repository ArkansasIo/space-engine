/**
 * presetService.ts — preset catalogue helpers.
 */
import * as presetModel from '@models/presetModel';
import { notFound } from '@utils/errors';
import { validateCategory } from '@services/sceneValidator';
import type { Preset } from '@/types';

export async function list(category?: string): Promise<Preset[]> {
  return presetModel.list(category ? validateCategory(category) : undefined);
}

export async function getByKey(key: string): Promise<Preset> {
  const preset = await presetModel.findByKey(key);
  if (!preset) throw notFound(`No preset with key "${key}"`);
  return preset;
}
