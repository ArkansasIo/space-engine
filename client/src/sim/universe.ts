/**
 * universe.ts — the composition layer.
 *
 * A **Universe** is the top-level component: it owns galaxies, each galaxy owns
 * systems, and each system owns bodies. Each level is itself a component with a
 * position, velocity and radius in the coordinate space of its parent, so the
 * same code drives a single solar system or a thousand-galaxy volume.
 *
 * ```
 * Universe ─┬─ Galaxy ─┬─ System ─┬─ Body
 *           │          └─ Body
 *           │          └─ System ─── Body
 *           └─ Galaxy ─── System ─── Body
 * ```
 *
 * ## Coordinate spaces
 *
 * - **Local space** — a body's `x/y/z`, relative to its system's barycentre.
 *   This is what `Engine` integrates; it is the only space where gravity acts.
 * - **Universe space** — the sum of every ancestor offset. `universePosition()`
 *   walks the chain and returns the body's absolute coordinates.
 *
 * Bodies in different systems do not attract each other by default: a galaxy is
 * modelled as many independent islands that drift, which keeps the integrator at
 * O(Σ nᵢ²) instead of O(N²). Set `interSystemGravity` to couple them (expensive).
 */
import { Body, resetIdCounter } from './body';
import { Engine } from './engine';
import { DEFAULT_GRAVITY, centerOfMass, totalEnergy } from './gravity';
import type { GravitySettings } from './gravity';
import type { CollisionMode } from './collision';
import type { Derivative } from '../lib/rkmethods';
import { rk4Step } from '../lib/rkmethods';
import { DEFAULT_DT, MAX_SUBSTEPS, MIN_DT } from './constants';
import { add3, mul3, sub3, len3, norm3, cross3, perpendicular3 } from '../lib/linalg3d';
import type { Vec3 } from '../lib/linalg3d';
import type {
  BodySpec,
  CameraSettings,
  Galaxy,
  GalaxyMorphology,
  SceneSettings,
  StarSystem,
  SystemKind,
  Universe
} from '../types';

/* ------------------------------------------------------------------ vectors */

type V3 = Vec3;

const asVec3 = (p: { x: number; y: number; z: number }): V3 => [p.x, p.y, p.z];

/* ------------------------------------------------------------------ options */

export interface UniverseOptions {
  seed?: number;
  gravity?: GravitySettings;
  collisionMode?: CollisionMode;
  dt?: number;
  interSystemGravity?: boolean;
}

/* ------------------------------------------------------------------- system */

export interface SystemOptions {
  id?: number;
  name?: string;
  kind?: SystemKind;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  radius?: number;
  color?: string;
  gravity?: GravitySettings;
  home?: boolean;
}

/**
 * A system is a gravitationally-bound island of bodies. It wraps an `Engine`
 * (one integrator per island) plus the offset that places it in its galaxy.
 */
export class System {
  id: number;
  name: string;
  kind: SystemKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
  gravity: GravitySettings;
  home: boolean;
  /** The island's integrator. Bodies live here, in local space. */
  engine: Engine;

  private static nextId = 1;

  constructor(opts: SystemOptions = {}) {
    this.id = opts.id ?? System.nextId++;
    if (opts.id !== undefined && opts.id >= System.nextId) System.nextId = opts.id + 1;
    this.name = opts.name ?? `System ${this.id}`;
    this.kind = opts.kind ?? 'solar';
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.z = opts.z ?? 0;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? 0;
    this.vz = opts.vz ?? 0;
    this.radius = opts.radius ?? 400;
    this.color = opts.color ?? '#8fb8ff';
    this.gravity = opts.gravity ?? { ...DEFAULT_GRAVITY };
    this.home = opts.home ?? false;
    this.engine = new Engine({ gravity: this.gravity });
    this.engine.loadScene({
      bodies: [],
      gravity: this.gravity,
      camera: { x: 0, y: 0, zoom: 1 }
    });
  }

  /** Reset the shared id counter (scene loads / tests). */
  static resetIds(value = 1): void {
    System.nextId = value;
  }

  get bodies(): Body[] {
    return this.engine.bodies;
  }

  get bodyCount(): number {
    return this.engine.bodies.length;
  }

  get time(): number {
    return this.engine.time;
  }

  /** System barycentre in local space. */
  get barycentre(): V3 {
    return centerOfMass(this.engine.bodies);
  }

  /** Total mass of the island. */
  get mass(): number {
    let m = 0;
    for (const b of this.engine.bodies) m += b.mass;
    return m;
  }

  /** Total energy of the island. */
  get energy(): number {
    return totalEnergy(this.engine.bodies, this.gravity);
  }

  addBody(spec: BodySpec | ConstructorParameters<typeof Body>[0]): Body {
    return this.engine.addBody(spec as ConstructorParameters<typeof Body>[0]);
  }

  /** Load a set of body specs, replacing whatever the system held. */
  loadBodies(specs: BodySpec[]): void {
    this.engine.loadScene({
      bodies: specs,
      gravity: this.gravity,
      camera: { x: 0, y: 0, zoom: 1 }
    });
  }

  /**
   * Advance this island by `dt`. The system's own drift through galaxy space is
   * integrated with the same RK4 step so a system can orbit a galaxy core.
   */
  step(dt: number, gravity: GravitySettings, anchor?: V3): void {
    this.engine.step(dt);
    this.integrateDrift(dt, gravity, anchor);
  }

  /** Ballistic/central-force integration of the system's own barycentre. */
  private integrateDrift(dt: number, gravity: GravitySettings, anchor?: V3): void {
    if (!anchor) {
      // Free drift: straight line at constant velocity.
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      return;
    }
    const g = gravity.G;
    const eps2 = gravity.softening * gravity.softening;
    const f: Derivative = (_t, y) => {
      const r2 = (y[0] - anchor[0]) ** 2 + (y[1] - anchor[1]) ** 2 + (y[2] - anchor[2]) ** 2 + eps2;
      const invR3 = 1 / (Math.sqrt(r2) * r2);
      return [
        y[3],
        y[4],
        y[5],
        -g * invR3 * (y[0] - anchor[0]),
        -g * invR3 * (y[1] - anchor[1]),
        -g * invR3 * (y[2] - anchor[2])
      ];
    };
    const next = rk4Step(f, 0, [this.x, this.y, this.z, this.vx, this.vy, this.vz], dt);
    this.x = next[0];
    this.y = next[1];
    this.z = next[2];
    this.vx = next[3];
    this.vy = next[4];
    this.vz = next[5];
  }

  /** Absolute position of a body: system offset + local coordinates. */
  universePosition(body: Body, galaxy?: Galaxy): V3 {
    const local = asVec3(body);
    const sys = asVec3(this);
    const gx: V3 = galaxy ? asVec3(galaxy) : [0, 0, 0];
    return add3(add3(gx, sys), local);
  }

  /** Snapshot as a serialisable `StarSystem`. */
  toSpec(): StarSystem {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      x: this.x,
      y: this.y,
      z: this.z,
      vx: this.vx,
      vy: this.vy,
      vz: this.vz,
      radius: this.radius,
      color: this.color,
      bodies: this.engine.bodies.map((b) => b.toSpec()),
      gravity: { ...this.gravity },
      home: this.home
    };
  }

  static fromSpec(spec: StarSystem): System {
    const s = new System({
      id: spec.id,
      name: spec.name,
      kind: spec.kind,
      x: spec.x,
      y: spec.y,
      z: spec.z,
      vx: spec.vx,
      vy: spec.vy,
      vz: spec.vz,
      radius: spec.radius,
      color: spec.color,
      gravity: spec.gravity,
      home: spec.home
    });
    s.loadBodies(spec.bodies);
    return s;
  }

  /** Deep copy, including every body. */
  clone(): System {
    return System.fromSpec(this.toSpec());
  }
}

/* ------------------------------------------------------------------- galaxy */

export interface GalaxyOptions {
  id?: number;
  name?: string;
  morphology?: GalaxyMorphology;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  radius?: number;
  arms?: number;
  color?: string;
  coreMass?: number;
}

/** A galaxy groups systems and (optionally) orbits them about a massive core. */
export class GalaxyComponent {
  id: number;
  name: string;
  morphology: GalaxyMorphology;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  arms: number;
  color: string;
  coreMass: number;
  systems: System[] = [];

  private static nextId = 1;

  constructor(opts: GalaxyOptions = {}) {
    this.id = opts.id ?? GalaxyComponent.nextId++;
    if (opts.id !== undefined && opts.id >= GalaxyComponent.nextId) {
      GalaxyComponent.nextId = opts.id + 1;
    }
    this.name = opts.name ?? `Galaxy ${this.id}`;
    this.morphology = opts.morphology ?? 'spiral';
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.z = opts.z ?? 0;
    this.vx = opts.vx ?? 0;
    this.vy = opts.vy ?? 0;
    this.vz = opts.vz ?? 0;
    this.radius = opts.radius ?? 8000;
    this.arms = opts.arms ?? 2;
    this.color = opts.color ?? '#c9b8ff';
    this.coreMass = opts.coreMass ?? 0;
  }

  static resetIds(value = 1): void {
    GalaxyComponent.nextId = value;
  }

  get systemCount(): number {
    return this.systems.length;
  }

  get bodyCount(): number {
    let n = 0;
    for (const s of this.systems) n += s.bodyCount;
    return n;
  }

  /** Total mass of every system, plus the core. */
  get mass(): number {
    let m = this.coreMass;
    for (const s of this.systems) m += s.mass;
    return m;
  }

  get barycentre(): V3 {
    return asVec3(this);
  }

  addSystem(opts: SystemOptions): System {
    const s = new System(opts);
    this.systems.push(s);
    return s;
  }

  findSystem(id: number): System | undefined {
    return this.systems.find((s) => s.id === id);
  }

  /**
   * Advance every system in the galaxy. Systems feel the galactic core (if any)
   * as a central force; their internal bodies are integrated by their own engine.
   */
  step(dt: number, gravity: GravitySettings): void {
    const anchor: V3 | undefined = this.coreMass > 0 ? [this.x, this.y, this.z] : undefined;
    for (const s of this.systems) s.step(dt, gravity, anchor);

    if (this.coreMass > 0) {
      const g = gravity.G;
      const eps2 = gravity.softening * gravity.softening;
      const f: Derivative = (_t, y) => {
        const r2 = y[0] * y[0] + y[1] * y[1] + y[2] * y[2] + eps2;
        const invR3 = 1 / (Math.sqrt(r2) * r2);
        const k = -g * this.coreMass * invR3;
        return [y[3], y[4], y[5], k * y[0], k * y[1], k * y[2]];
      };
      // Integrate the galaxy's own offset about the universe origin.
      const next = rk4Step(
        f,
        0,
        [this.x, this.y, this.z, this.vx, this.vy, this.vz],
        dt
      );
      this.x = next[0];
      this.y = next[1];
      this.z = next[2];
      this.vx = next[3];
      this.vy = next[4];
      this.vz = next[5];
    }
  }

  toSpec(): Galaxy {
    return {
      id: this.id,
      name: this.name,
      morphology: this.morphology,
      x: this.x,
      y: this.y,
      z: this.z,
      vx: this.vx,
      vy: this.vy,
      vz: this.vz,
      radius: this.radius,
      arms: this.arms,
      color: this.color,
      coreMass: this.coreMass,
      systems: this.systems.map((s) => s.toSpec())
    };
  }

  static fromSpec(spec: Galaxy): GalaxyComponent {
    const g = new GalaxyComponent({
      id: spec.id,
      name: spec.name,
      morphology: spec.morphology,
      x: spec.x,
      y: spec.y,
      z: spec.z,
      vx: spec.vx,
      vy: spec.vy,
      vz: spec.vz,
      radius: spec.radius,
      arms: spec.arms,
      color: spec.color,
      coreMass: spec.coreMass
    });
    g.systems = spec.systems.map((s) => System.fromSpec(s));
    return g;
  }

  clone(): GalaxyComponent {
    return GalaxyComponent.fromSpec(this.toSpec());
  }
}

/* ----------------------------------------------------------------- universe */

/**
 * The top-level component. Owns galaxies, drives the whole hierarchy, and can
 * flatten itself into a single `SceneSettings` for the renderer or the API.
 */
export class UniverseSim {
  seed: number;
  galaxies: GalaxyComponent[] = [];
  gravity: GravitySettings;
  collisionMode: CollisionMode;
  interSystemGravity: boolean;
  time = 0;
  steps = 0;

  private dt: number;

  constructor(opts: UniverseOptions = {}) {
    this.seed = opts.seed ?? 1;
    this.gravity = opts.gravity ?? { ...DEFAULT_GRAVITY };
    this.collisionMode = opts.collisionMode ?? 'merge';
    this.interSystemGravity = opts.interSystemGravity ?? false;
    this.dt = opts.dt ?? DEFAULT_DT;
  }

  /** Reset every id counter so a generated universe is reproducible. */
  static resetIds(): void {
    resetIdCounter(1);
    System.resetIds(1);
    GalaxyComponent.resetIds(1);
  }

  get galaxyCount(): number {
    return this.galaxies.length;
  }

  get systemCount(): number {
    let n = 0;
    for (const g of this.galaxies) n += g.systemCount;
    return n;
  }

  get bodyCount(): number {
    let n = 0;
    for (const g of this.galaxies) n += g.bodyCount;
    return n;
  }

  /** Every system in the universe, flattened. */
  allSystems(): System[] {
    const out: System[] = [];
    for (const g of this.galaxies) out.push(...g.systems);
    return out;
  }

  /** Every body in the universe, flattened. */
  allBodies(): Body[] {
    const out: Body[] = [];
    for (const g of this.galaxies) for (const s of g.systems) out.push(...s.bodies);
    return out;
  }

  findSystem(id: number): System | undefined {
    for (const g of this.galaxies) {
      const s = g.findSystem(id);
      if (s) return s;
    }
    return undefined;
  }

  findBody(id: number): Body | undefined {
    for (const g of this.galaxies) {
      for (const s of g.systems) {
        const b = s.engine.findBody(id);
        if (b) return b;
      }
    }
    return undefined;
  }

  addGalaxy(opts: GalaxyOptions): GalaxyComponent {
    const g = new GalaxyComponent(opts);
    this.galaxies.push(g);
    return g;
  }

  /** Total mass of everything the universe contains. */
  get mass(): number {
    let m = 0;
    for (const g of this.galaxies) m += g.mass;
    return m;
  }

  /** Bounding radius across every system's own extent. */
  get radius(): number {
    let r = 0;
    for (const g of this.galaxies) {
      for (const s of g.systems) {
        const d = len3(asVec3(s));
        r = Math.max(r, d + s.radius);
      }
    }
    return r;
  }

  /* ---------------------------------------------------------------- stepping */

  /** One fixed step of the entire hierarchy. */
  step(dt = this.dt): void {
    for (const g of this.galaxies) g.step(dt, this.gravity);
    if (this.interSystemGravity) this.coupleSystems(dt);
    this.time += dt;
    this.steps++;
  }

  /**
   * Cross-system attraction. Each system's barycentre is pulled by every other
   * system's total mass — an O(S²) N-body problem over systems, not bodies.
   */
  private coupleSystems(dt: number): void {
    const systems = this.allSystems();
    const n = systems.length;
    if (n < 2) return;

    const eps2 = this.gravity.softening * this.gravity.softening;
    const G = this.gravity.G;
    const acc: V3[] = systems.map(() => [0, 0, 0]);

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = systems[i];
        const b = systems[j];
        const d: V3 = [b.x - a.x, b.y - a.y, b.z - a.z];
        const r2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] + eps2;
        const invR3 = 1 / (Math.sqrt(r2) * r2);
        const fa = G * invR3 * b.mass;
        const fb = G * invR3 * a.mass;
        acc[i][0] += fa * d[0];
        acc[i][1] += fa * d[1];
        acc[i][2] += fa * d[2];
        acc[j][0] -= fb * d[0];
        acc[j][1] -= fb * d[1];
        acc[j][2] -= fb * d[2];
      }
    }

    for (let i = 0; i < n; i++) {
      const s = systems[i];
      s.vx += acc[i][0] * dt;
      s.vy += acc[i][1] * dt;
      s.vz += acc[i][2] * dt;
    }
  }

  /** Advance by a wall-clock delta, sub-stepping to stay stable. */
  advance(realDtSeconds: number, timeScale = 1): void {
    const target = Math.max(MIN_DT, realDtSeconds) * timeScale;
    const sub = Math.min(MAX_SUBSTEPS, Math.max(1, Math.round(target / this.dt)));
    const h = target / sub;
    for (let i = 0; i < sub; i++) this.step(h);
  }

  /* --------------------------------------------------------------- analytics */

  /** Total kinetic + potential energy across every system. */
  get energy(): number {
    let e = 0;
    for (const g of this.galaxies) for (const s of g.systems) e += s.energy;
    return e;
  }

  /** Counts by system kind — handy for HUD summaries. */
  census(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const s of this.allSystems()) out[s.kind] = (out[s.kind] ?? 0) + 1;
    return out;
  }

  /** True when the universe holds nothing at all. */
  get isEmpty(): boolean {
    return this.galaxies.length === 0;
  }

  /* ------------------------------------------------------------- conversion */

  /**
   * Flatten every body into one scene, offset by its system and galaxy. The
   * renderer can then draw the whole universe without knowing the hierarchy.
   */
  toScene(camera: CameraSettings = { x: 0, y: 0, zoom: 1 }): SceneSettings {
    const bodies: BodySpec[] = [];
    for (const g of this.galaxies) {
      for (const s of g.systems) {
        for (const b of s.bodies) {
          const p = s.universePosition(b, g);
          bodies.push({
            ...b.toSpec(),
            x: p[0],
            y: p[1],
            z: p[2],
            vx: b.vx + s.vx + g.vx,
            vy: b.vy + s.vy + g.vy,
            vz: b.vz + s.vz + g.vz,
            systemId: s.id
          });
        }
      }
    }
    return { bodies, gravity: { ...this.gravity }, camera: { ...camera } };
  }

  /** Serialise the whole hierarchy. */
  toSpec(): Universe {
    return {
      seed: this.seed,
      galaxies: this.galaxies.map((g) => g.toSpec()),
      gravity: { ...this.gravity },
      camera: { x: 0, y: 0, zoom: 1 },
      interSystemGravity: this.interSystemGravity
    };
  }

  static fromSpec(spec: Universe): UniverseSim {
    const u = new UniverseSim({
      seed: spec.seed,
      gravity: spec.gravity,
      interSystemGravity: spec.interSystemGravity
    });
    u.galaxies = spec.galaxies.map((g) => GalaxyComponent.fromSpec(g));
    return u;
  }

  clone(): UniverseSim {
    return UniverseSim.fromSpec(this.toSpec());
  }
}

/* ------------------------------------------------------------------ helpers */

/** Local-space offset of a system relative to its galaxy. */
export function systemOffset(system: System): V3 {
  return [system.x, system.y, system.z];
}

/**
 * Unit vector from a system toward the galaxy centre — used by generators to
 * aim infall and by the renderer to draw galactic rotation.
 */
export function towardCore(system: System): V3 {
  return norm3(mul3([system.x, system.y, system.z], -1)) as V3;
}

/**
 * Orbital plane normal for a system inside a galaxy, so systems orbit the core
 * in a common (but slightly scattered) disc rather than all in the XY plane.
 */
export function discNormal(system: System, galaxy: GalaxyComponent): V3 {
  const r: V3 = [system.x, system.y, system.z];
  const v: V3 = [system.vx, system.vy, system.vz];
  const h = cross3(r, v);
  if (len3(h) < 1e-9) return perpendicular3([galaxy.x, galaxy.y, 1]);
  return norm3(h);
}

/** Displacement between two systems in galaxy space. */
export function systemSeparation(a: System, b: System): number {
  return len3(sub3([a.x, a.y, a.z], [b.x, b.y, b.z]));
}
