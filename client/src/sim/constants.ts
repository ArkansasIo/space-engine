/**
 * constants.ts — physical + simulation constants for the client engine.
 */

/** Default gravitational constant in simulation units. */
export const DEFAULT_G = 1;

/** Plummer softening length (world units) to avoid singularities. */
export const DEFAULT_SOFTENING = 4;

/** Speed of light in simulation units (used by the relativistic terms). */
export const C_LIGHT = 300;

/** Schwarzschild radius per unit of mass: r_s = 2 G M / c². */
export const SCHWARZSCHILD_PER_MASS = (2 * DEFAULT_G) / (C_LIGHT * C_LIGHT);

/** Integration defaults. */
export const DEFAULT_DT = 1 / 60;
export const MIN_DT = 1 / 240;
export const MAX_DT = 1 / 15;
export const MAX_SUBSTEPS = 8;

/** Renderer defaults. */
export const DEFAULT_TRAIL_LENGTH = 240;
export const MAX_TRAIL_LENGTH = 4000;
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 40;

/** Body defaults. */
export const DEFAULT_RADIUS = 6;
export const DEFAULT_MASS = 1;
export const DEFAULT_COLOR = '#ffcf6b';

/** Collision handling. */
export const COLLISION_RESTITUTION = 0.35;
export const COLLISION_MERGE_FACTOR = 0.85;

/** Visual palette keyed by body kind. */
export const KIND_COLORS: Record<string, string> = {
  star: '#ffd479',
  planet: '#5aa7e6',
  blackhole: '#8a2be2',
  neutron: '#cfe8ff',
  dust: '#ffcf6b',
  ship: '#9be7a0'
};

/** Human labels for body kinds. */
export const KIND_LABELS: Record<string, string> = {
  star: 'Star',
  planet: 'Planet',
  blackhole: 'Black Hole',
  neutron: 'Neutron Star',
  dust: 'Dust',
  ship: 'Ship'
};

/** Numeric type guard for body kinds. */
export const BODY_KINDS = ['star', 'planet', 'blackhole', 'neutron', 'dust', 'ship'] as const;
export type BodyKind = (typeof BODY_KINDS)[number];
