/**
 * index.ts — shared client-side types.
 */
import type { BodyKind } from '../sim/constants';

export type { BodyKind };

export interface BodySpec {
  name: string;
  kind: BodyKind;
  mass: number;
  radius: number;
  x: number;
  y: number;
  /** Depth axis. Optional for backward compatibility; defaults to 0. */
  z?: number;
  vx: number;
  vy: number;
  /** Out-of-plane velocity. Optional; defaults to 0. */
  vz?: number;
  color: string;
  temperature?: number;
  luminosity?: number;
  spin?: number;
  fixed?: boolean;
  trailLength?: number;
  /** Owning system id — set when the scene is part of a universe. */
  systemId?: number;
}

export interface GravitySettings {
  G: number;
  softening: number;
  relativistic: boolean;
}

export interface CameraSettings {
  x: number;
  y: number;
  zoom: number;
}

export interface SceneSettings {
  bodies: BodySpec[];
  gravity: GravitySettings;
  camera: CameraSettings;
}

/* ------------------------------------------------------------------ universe */

/**
 * A system is one gravitationally-bound island: a star cluster, a solar system,
 * an accretion disc. Bodies interact only with others in the same system unless
 * `interSystemGravity` is enabled on the universe.
 */
export interface StarSystem {
  id: number;
  name: string;
  kind: SystemKind;
  /** Universe-space position of the system's barycentre. */
  x: number;
  y: number;
  z: number;
  /** Drift velocity of the whole system through universe space. */
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
  bodies: BodySpec[];
  gravity: GravitySettings;
  /** Marks the observer's home system. */
  home?: boolean;
}

export type SystemKind =
  | 'solar'
  | 'binary'
  | 'cluster'
  | 'blackhole'
  | 'nebula'
  | 'rogue';

/** A galaxy: a gravitationally-bound collection of systems. */
export interface Galaxy {
  id: number;
  name: string;
  /** Morphology, e.g. 'spiral' | 'elliptical' | 'irregular'. */
  morphology: GalaxyMorphology;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Galactic radius (universe units). */
  radius: number;
  /** Number of arms for spiral morphologies. */
  arms: number;
  color: string;
  /** Central supermassive black hole mass (0 when there is none). */
  coreMass: number;
  systems: StarSystem[];
}

export type GalaxyMorphology = 'spiral' | 'barred-spiral' | 'elliptical' | 'irregular' | 'ring';

/** Top-level scene: a universe holding galaxies, each holding systems. */
export interface Universe {
  seed: number;
  galaxies: Galaxy[];
  gravity: GravitySettings;
  camera: CameraSettings;
  /**
   * When true, bodies in different systems also attract each other. Expensive
   * (O(N²) across the whole universe) so it is off by default.
   */
  interSystemGravity: boolean;
}

export interface PublicUser {
  id: number;
  username: string;
  displayName: string | null;
  role: 'user' | 'admin';
}

export interface AuthResult {
  user: PublicUser;
  token: string;
  expiresIn: string;
}

export interface Simulation {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  presetKey: string | null;
  bodyCount: number;
  seed: number | null;
  settings: SceneSettings;
  isPublic: boolean;
  isArchived: boolean;
  playCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: string;
}

export interface PresetDto {
  id: number;
  key: string;
  name: string;
  category: 'blackhole' | 'stellar' | 'orbital' | 'exotic' | 'sandbox';
  description: string | null;
  difficulty: number;
  settings: SceneSettings;
  isBuiltin: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface Experiment {
  id: number;
  simulationId: number | null;
  userId: number;
  label: string;
  integralValue: number | null;
  derivativeAt: number | null;
  energyDrift: number | null;
  samples: number;
  result: unknown;
  measuredAt: string;
}

export interface BodyDto {
  id: number;
  simulationId: number;
  name: string;
  kind: BodyKind;
  mass: number;
  radius: number;
  posX: number;
  posY: number;
  velX: number;
  velY: number;
  color: string;
  temperature: number;
  luminosity: number;
  spin: number;
  isFixed: boolean;
  trailLength: number;
  createdAt: string;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
