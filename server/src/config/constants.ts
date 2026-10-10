/**
 * constants.ts — shared server-side constants and enumerations.
 */

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BODY_KINDS = ['star', 'planet', 'blackhole', 'neutron', 'dust', 'ship'] as const;
export type BodyKind = (typeof BODY_KINDS)[number];

export const PRESET_CATEGORIES = ['blackhole', 'stellar', 'orbital', 'exotic', 'sandbox'] as const;
export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

/** Default page size for list endpoints. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Event types written to the api_events audit table. */
export const EVENT_TYPES = {
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  SIM_CREATE: 'sim.create',
  SIM_UPDATE: 'sim.update',
  SIM_DELETE: 'sim.delete',
  SIM_PLAY: 'sim.play',
  EXP_CREATE: 'experiment.create',
  EXP_DELETE: 'experiment.delete'
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
