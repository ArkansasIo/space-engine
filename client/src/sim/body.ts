/**
 * body.ts — the mutable simulation object.
 */
import {
  DEFAULT_RADIUS,
  DEFAULT_MASS,
  DEFAULT_COLOR,
  DEFAULT_TRAIL_LENGTH,
  KIND_COLORS,
  BODY_KINDS
} from './constants';
import type { BodyKind } from './constants';
import type { BodySpec } from '../types';

export interface BodyOptions {
  id?: number;
  name?: string;
  kind?: BodyKind;
  mass?: number;
  radius?: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  color?: string;
  temperature?: number;
  luminosity?: number;
  spin?: number;
  fixed?: boolean;
  trailLength?: number;
}

let nextId = 1;

/** Reset the internal id counter (used by tests / scene loads). */
export function resetIdCounter(value = 1): void {
  nextId = value;
}

export class Body {
  id: number;
  name: string;
  kind: BodyKind;
  mass: number;
  radius: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ax = 0;
  ay = 0;
  az = 0;
  color: string;
  temperature: number;
  luminosity: number;
  spin: number;
  fixed: boolean;
  trailLength: number;
  trail: Array<[number, number, number]> = [];
  alive = true;

  constructor(opts: BodyOptions = {}) {
    this.id = opts.id ?? nextId++;
    if (opts.id !== undefined && opts.id >= nextId) nextId = opts.id + 1;
    this.name = opts.name ?? `Body ${this.id}`;
    this.kind = opts.kind ?? 'planet';
    this.mass = opts.mass ?? DEFAULT_MASS;
    this.radius = opts.radius ?? DEFAULT_RADIUS;
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.z = opts.z ?? 0;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? 0;
    this.vz = opts.vz ?? 0;
    this.color = opts.color ?? KIND_COLORS[this.kind] ?? DEFAULT_COLOR;
    this.temperature = opts.temperature ?? 0;
    this.luminosity = opts.luminosity ?? 0;
    this.spin = opts.spin ?? 0;
    this.fixed = opts.fixed ?? false;
    this.trailLength = opts.trailLength ?? DEFAULT_TRAIL_LENGTH;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy, this.vz);
  }

  /** In-plane speed, for callers that only care about the projected motion. */
  get planarSpeed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  get kineticEnergy(): number {
    return 0.5 * this.mass * (this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);
  }

  /** Position as a 3-D vector. */
  get pos(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** Velocity as a 3-D vector. */
  get vel(): [number, number, number] {
    return [this.vx, this.vy, this.vz];
  }

  setPos(p: [number, number, number]): void {
    this.x = p[0];
    this.y = p[1];
    this.z = p[2];
  }

  setVel(v: [number, number, number]): void {
    this.vx = v[0];
    this.vy = v[1];
    this.vz = v[2];
  }

  /** Push the current position onto the trail ring buffer. */
  pushTrail(): void {
    if (this.trailLength <= 0) return;
    this.trail.push([this.x, this.y, this.z]);
    while (this.trail.length > this.trailLength) this.trail.shift();
  }

  clearTrail(): void {
    this.trail.length = 0;
  }

  toSpec(): BodySpec {
    return {
      name: this.name,
      kind: this.kind,
      mass: this.mass,
      radius: this.radius,
      x: this.x,
      y: this.y,
      z: this.z,
      vx: this.vx,
      vy: this.vy,
      vz: this.vz,
      color: this.color,
      temperature: this.temperature,
      luminosity: this.luminosity,
      spin: this.spin,
      fixed: this.fixed,
      trailLength: this.trailLength
    };
  }

  static fromSpec(spec: BodySpec): Body {
    return new Body({ ...spec, kind: normalizeKind(spec.kind) });
  }

  clone(): Body {
    const b = Body.fromSpec(this.toSpec());
    b.id = this.id;
    b.ax = this.ax;
    b.ay = this.ay;
    b.az = this.az;
    return b;
  }
}

/** Coerce an arbitrary string to a valid BodyKind. */
export function normalizeKind(kind: string | undefined): BodyKind {
  return BODY_KINDS.includes(kind as BodyKind) ? (kind as BodyKind) : 'planet';
}
