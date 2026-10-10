/**
 * sceneValidator.ts — normalises and sanity-checks a serialised scene.
 *
 * The client sends a `settings` blob; we clamp it to safe ranges before it is
 * persisted so a bad payload cannot wedge the renderer on reload.
 */
import { env } from '@config/env';
import { BODY_KINDS, PRESET_CATEGORIES } from '@config/constants';
import { badRequest } from '@utils/errors';
import { isPlainObject } from '@utils/sanitize';
import type { BodySpec, SceneSettings, GravitySettings, CameraSettings } from '@/types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampNum(v: unknown, fallback: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, num(v, fallback)));
}

export type BodyKind = BodySpec['kind'];

export function validateBody(raw: unknown, index: number): BodySpec {
  if (!isPlainObject(raw)) throw badRequest(`body[${index}] must be an object`);

  const kind = String(raw.kind ?? 'planet') as BodyKind;
  if (!BODY_KINDS.includes(kind as (typeof BODY_KINDS)[number])) {
    throw badRequest(`body[${index}].kind must be one of: ${BODY_KINDS.join(', ')}`);
  }

  const color = typeof raw.color === 'string' && HEX_COLOR.test(raw.color) ? raw.color : '#ffcf6b';
  const name = String(raw.name ?? `Body ${index + 1}`).slice(0, 80);

  return {
    name,
    kind,
    mass: clampNum(raw.mass, 1, 0, 1e12),
    radius: clampNum(raw.radius, 6, 0.5, 5000),
    x: clampNum(raw.x, 0, -1e7, 1e7),
    y: clampNum(raw.y, 0, -1e7, 1e7),
    vx: clampNum(raw.vx, 0, -1e4, 1e4),
    vy: clampNum(raw.vy, 0, -1e4, 1e4),
    color,
    temperature: clampNum(raw.temperature, 0, 0, 1e7),
    luminosity: clampNum(raw.luminosity, 0, 0, 1e7),
    spin: clampNum(raw.spin, 0, -1, 1),
    fixed: raw.fixed === true,
    trailLength: Math.round(clampNum(raw.trailLength, 240, 0, 4000))
  };
}

export function validateScene(raw: unknown): SceneSettings {
  if (!isPlainObject(raw)) throw badRequest('settings must be an object');

  const rawBodies = raw.bodies;
  if (!Array.isArray(rawBodies)) throw badRequest('settings.bodies must be an array');
  if (rawBodies.length > env.maxBodiesPerSimulation) {
    throw badRequest(`Too many bodies (max ${env.maxBodiesPerSimulation})`);
  }

  const bodies = rawBodies.map((b, i) => validateBody(b, i));

  const rawGravity = isPlainObject(raw.gravity) ? raw.gravity : {};
  const gravity: GravitySettings = {
    G: clampNum(rawGravity.G, 1, 0, 100),
    softening: clampNum(rawGravity.softening, 4, 0, 1000),
    relativistic: rawGravity.relativistic === true
  };

  const rawCamera = isPlainObject(raw.camera) ? raw.camera : {};
  const camera: CameraSettings = {
    x: clampNum(rawCamera.x, 0, -1e7, 1e7),
    y: clampNum(rawCamera.y, 0, -1e7, 1e7),
    zoom: clampNum(rawCamera.zoom, 1, 0.01, 100)
  };

  return { bodies, gravity, camera };
}

/** Validate a preset category string. */
export function validateCategory(raw: unknown): (typeof PRESET_CATEGORIES)[number] {
  const cat = String(raw ?? 'sandbox');
  if (!PRESET_CATEGORIES.includes(cat as (typeof PRESET_CATEGORIES)[number])) {
    throw badRequest(`category must be one of: ${PRESET_CATEGORIES.join(', ')}`);
  }
  return cat as (typeof PRESET_CATEGORIES)[number];
}
