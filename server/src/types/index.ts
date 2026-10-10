/**
 * index.ts — server-wide shared domain types.
 *
 * These mirror the database rows but in camelCase and with the shapes the
 * services/controllers hand back to the HTTP layer.
 */
import type { RowDataPacket } from 'mysql2';

export type ID = number;

/* ------------------------------------------------------------------ users */

export interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: 'user' | 'admin';
  is_active: number;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: ID;
  username: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: ID;
  username: string;
  displayName: string | null;
  role: 'user' | 'admin';
}

/* ------------------------------------------------------------ simulations */

export interface SimulationRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  preset_key: string | null;
  body_count: number;
  seed: number | null;
  settings: unknown;
  is_public: number;
  is_archived: number;
  play_count: number;
  created_at: Date;
  updated_at: Date;
}

/** Serialised scene document stored in `simulations.settings`. */
export interface BodySpec {
  name: string;
  kind: 'star' | 'planet' | 'blackhole' | 'neutron' | 'dust' | 'ship';
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

export interface Simulation {
  id: ID;
  userId: ID;
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

/* ---------------------------------------------------------------- bodies */

export interface BodyRow extends RowDataPacket {
  id: number;
  simulation_id: number;
  name: string;
  kind: BodySpec['kind'];
  mass: number;
  radius: number;
  pos_x: number;
  pos_y: number;
  vel_x: number;
  vel_y: number;
  color: string;
  temperature: number;
  luminosity: number;
  spin: number;
  is_fixed: number;
  trail_length: number;
  created_at: Date;
}

export interface Body {
  id: ID;
  simulationId: ID;
  name: string;
  kind: BodySpec['kind'];
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

/* --------------------------------------------------------------- presets */

export interface PresetRow extends RowDataPacket {
  id: number;
  key: string;
  name: string;
  category: 'blackhole' | 'stellar' | 'orbital' | 'exotic' | 'sandbox';
  description: string | null;
  difficulty: number;
  settings: unknown;
  is_builtin: number;
  sort_order: number;
  created_at: Date;
}

export interface Preset {
  id: ID;
  key: string;
  name: string;
  category: PresetRow['category'];
  description: string | null;
  difficulty: number;
  settings: SceneSettings;
  isBuiltin: boolean;
  sortOrder: number;
  createdAt: string;
}

/* ----------------------------------------------------------- experiments */

export interface ExperimentRow extends RowDataPacket {
  id: number;
  simulation_id: number | null;
  user_id: number;
  label: string;
  integral_value: number | null;
  derivative_at: number | null;
  energy_drift: number | null;
  samples: number;
  result: unknown;
  measured_at: Date;
}

export interface Experiment {
  id: ID;
  simulationId: ID | null;
  userId: ID;
  label: string;
  integralValue: number | null;
  derivativeAt: number | null;
  energyDrift: number | null;
  samples: number;
  result: unknown;
  measuredAt: string;
}

/* ------------------------------------------------------------- api events */

export interface ApiEventRow extends RowDataPacket {
  id: number;
  user_id: number | null;
  event_type: string;
  entity: string | null;
  entity_id: number | null;
  detail: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface ApiEvent {
  id: ID;
  userId: ID | null;
  eventType: string;
  entity: string | null;
  entityId: ID | null;
  detail: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------- pagination */

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
