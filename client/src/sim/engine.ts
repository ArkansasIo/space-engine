/**
 * engine.ts — the simulation engine: owns the bodies, steps the integrator,
 * tracks energy, and exposes the scene in a serialisable form.
 */
import { Body, resetIdCounter } from './body';
import { computeAccelerations, totalEnergy, DEFAULT_GRAVITY } from './gravity';
import type { GravitySettings } from './gravity';
import { resolve, prune } from './collision';
import type { CollisionMode } from './collision';
import { rk4Step } from '../lib/rkmethods';
import type { Derivative } from '../lib/rkmethods';
import {
  DEFAULT_DT,
  MAX_SUBSTEPS,
  MAX_TRAIL_LENGTH,
  MIN_DT
} from './constants';
import type { SceneSettings, CameraSettings, BodySpec } from '../types';

export interface EngineOptions {
  dt?: number;
  gravity?: GravitySettings;
  collisionMode?: CollisionMode;
  seed?: number | null;
}

export class Engine {
  bodies: Body[] = [];
  gravity: GravitySettings;
  collisionMode: CollisionMode;
  dt: number;
  time = 0;
  steps = 0;
  running = false;
  timeScale = 1;

  private initialEnergy = 0;

  constructor(opts: EngineOptions = {}) {
    this.dt = opts.dt ?? DEFAULT_DT;
    this.gravity = opts.gravity ?? { ...DEFAULT_GRAVITY };
    this.collisionMode = opts.collisionMode ?? 'merge';
  }

  /* ------------------------------------------------------------ lifecycle */

  loadScene(scene: SceneSettings): void {
    resetIdCounter(1);
    this.bodies = scene.bodies.map((spec) => Body.fromSpec(spec));
    this.gravity = { ...scene.gravity };
    this.time = 0;
    this.steps = 0;
    this.initialEnergy = totalEnergy(this.bodies, this.gravity);
  }

  toScene(camera: CameraSettings = { x: 0, y: 0, zoom: 1 }): SceneSettings {
    return {
      bodies: this.bodies.map((b) => b.toSpec()),
      gravity: { ...this.gravity },
      camera: { ...camera }
    };
  }

  addBody(opts: ConstructorParameters<typeof Body>[0]): Body {
    const body = new Body(opts);
    this.bodies.push(body);
    return body;
  }

  removeBody(id: number): boolean {
    const idx = this.bodies.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    this.bodies.splice(idx, 1);
    return true;
  }

  findBody(id: number): Body | undefined {
    return this.bodies.find((b) => b.id === id);
  }

  clear(): void {
    this.bodies = [];
    this.time = 0;
    this.steps = 0;
    this.initialEnergy = 0;
  }

  /* -------------------------------------------------------------- stepping */

  /** One fixed-step advance of the whole system. */
  step(dt = this.dt): void {
    if (!this.bodies.length) return;

    const dim = this.bodies.length * 2;
    const state = new Array<number>(dim * 2);
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      state[i] = b.x;
      state[this.bodies.length + i] = b.y;
      state[dim + i] = b.vx;
      state[dim + this.bodies.length + i] = b.vy;
    }

    const f: Derivative = (_t, y) => {
      const n = this.bodies.length;
      const out = new Array<number>(y.length);
      // positions stay put; velocities copy through
      for (let i = 0; i < n; i++) {
        out[i] = y[2 * n + i];
        out[n + i] = y[3 * n + i];
      }
      // write current positions to a temp body view for the force model
      const saved = this.bodies.map((b) => [b.x, b.y, b.vx, b.vy] as [number, number, number, number]);
      for (let i = 0; i < n; i++) {
        const b = this.bodies[i];
        b.x = y[i];
        b.y = y[n + i];
        b.vx = y[2 * n + i];
        b.vy = y[3 * n + i];
      }
      computeAccelerations(this.bodies, this.gravity);
      for (let i = 0; i < n; i++) {
        out[2 * n + i] = this.bodies[i].ax;
        out[3 * n + i] = this.bodies[i].ay;
      }
      // restore so a rejected sub-step does not corrupt state
      for (let i = 0; i < n; i++) {
        const b = this.bodies[i];
        [b.x, b.y, b.vx, b.vy] = saved[i];
      }
      return out;
    };

    const next = rk4Step(f, this.time, state, dt);
    const n = this.bodies.length;
    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      b.x = next[i];
      b.y = next[n + i];
      b.vx = next[2 * n + i];
      b.vy = next[3 * n + i];
    }

    this.time += dt;
    this.steps++;

    if (this.collisionMode !== 'none') {
      resolve(this.bodies, this.collisionMode);
      this.bodies = prune(this.bodies);
    }

    for (const b of this.bodies) b.pushTrail();
  }

  /** Advance by a wall-clock delta, sub-stepping to stay stable. */
  advance(realDtSeconds: number): void {
    const target = Math.max(MIN_DT, realDtSeconds) * this.timeScale;
    const sub = Math.min(MAX_SUBSTEPS, Math.max(1, Math.round(target / this.dt)));
    const h = target / sub;
    for (let i = 0; i < sub; i++) this.step(h);
  }

  /* ------------------------------------------------------------- analytics */

  get energy(): number {
    return totalEnergy(this.bodies, this.gravity);
  }

  /** Fractional drift of total energy from the scene's initial value. */
  get energyDrift(): number {
    if (this.initialEnergy === 0) return 0;
    return (this.energy - this.initialEnergy) / Math.abs(this.initialEnergy);
  }

  get bodyCount(): number {
    return this.bodies.length;
  }

  /** Reset the energy baseline to the current state. */
  rebaseEnergy(): void {
    this.initialEnergy = this.energy;
  }

  /** Clamp a requested trail length to the supported range. */
  static clampTrail(n: number): number {
    return Math.max(0, Math.min(MAX_TRAIL_LENGTH, Math.round(n)));
  }

  /** Deep snapshot of the bodies (for undo / experiment capture). */
  snapshot(): BodySpec[] {
    return this.bodies.map((b) => b.toSpec());
  }
}
