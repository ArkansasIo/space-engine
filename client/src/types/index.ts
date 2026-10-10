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
  vx: number;
  vy: number;
  color: string;
  temperature?: number;
  luminosity?: number;
  spin?: number;
  fixed?: boolean;
  trailLength?: number;
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
