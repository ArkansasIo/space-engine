/**
 * gravity.ts — force accumulation and the acceleration field.
 */
import { DEFAULT_G, DEFAULT_SOFTENING, C_LIGHT } from './constants';
import type { Body } from './body';
import { grCorrection } from './relativity';

export interface GravitySettings {
  G: number;
  softening: number;
  relativistic: boolean;
}

export const DEFAULT_GRAVITY: GravitySettings = {
  G: DEFAULT_G,
  softening: DEFAULT_SOFTENING,
  relativistic: false
};

/**
 * Accumulate pairwise gravitational accelerations onto every body.
 * O(n²) — fine for the hundreds of bodies this simulator targets.
 */
export function computeAccelerations(
  bodies: Body[],
  settings: GravitySettings = DEFAULT_GRAVITY
): void {
  const { G, softening, relativistic } = settings;
  const eps2 = softening * softening;

  for (const b of bodies) {
    b.ax = 0;
    b.ay = 0;
    b.az = 0;
  }

  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const r2 = dx * dx + dy * dy + dz * dz + eps2;
      const invR = 1 / Math.sqrt(r2);
      const invR3 = invR / r2;

      const f = G * invR3;

      a.ax += f * b.mass * dx;
      a.ay += f * b.mass * dy;
      a.az += f * b.mass * dz;
      b.ax -= f * a.mass * dx;
      b.ay -= f * a.mass * dy;
      b.az -= f * a.mass * dz;

      if (relativistic) {
        const corrA = grCorrection([a.x, a.y], [a.vx, a.vy], b.mass, [b.x, b.y], G, C_LIGHT);
        const corrB = grCorrection([b.x, b.y], [b.vx, b.vy], a.mass, [a.x, a.y], G, C_LIGHT);
        a.ax += corrA[0];
        a.ay += corrA[1];
        b.ax += corrB[0];
        b.ay += corrB[1];
      }
    }
  }

  for (const b of bodies) {
    if (b.fixed) {
      b.ax = 0;
      b.ay = 0;
    }
  }
}

/** Potential energy of the system (negative for bound states). */
export function potentialEnergy(
  bodies: Body[],
  settings: GravitySettings = DEFAULT_GRAVITY
): number {
  const { G, softening } = settings;
  const eps2 = softening * softening;
  let u = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz + eps2);
      u -= (G * a.mass * b.mass) / r;
    }
  }
  return u;
}

/** Total kinetic energy of the system. */
export function kineticEnergy(bodies: Body[]): number {
  let k = 0;
  for (const b of bodies) k += b.kineticEnergy;
  return k;
}

/** Total energy (kinetic + potential). */
export function totalEnergy(bodies: Body[], settings: GravitySettings = DEFAULT_GRAVITY): number {
  return kineticEnergy(bodies) + potentialEnergy(bodies, settings);
}

/** Total linear momentum of the system. */
export function totalMomentum(bodies: Body[]): [number, number, number] {
  let px = 0;
  let py = 0;
  let pz = 0;
  for (const b of bodies) {
    px += b.mass * b.vx;
    py += b.mass * b.vy;
    pz += b.mass * b.vz;
  }
  return [px, py, pz];
}

/** Centre of mass of the system. */
export function centerOfMass(bodies: Body[]): [number, number, number] {
  let m = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const b of bodies) {
    m += b.mass;
    x += b.mass * b.x;
    y += b.mass * b.y;
    z += b.mass * b.z;
  }
  return m > 0 ? [x / m, y / m, z / m] : [0, 0, 0];
}

/**
 * Circular orbital speed for a satellite at distance r from a central mass.
 * v = sqrt(G M / r)
 */
export function circularSpeed(
  centralMass: number,
  r: number,
  G = DEFAULT_G
): number {
  return r <= 0 ? 0 : Math.sqrt((G * centralMass) / r);
}

/** Escape speed at distance r from a central mass. */
export function escapeSpeed(centralMass: number, r: number, G = DEFAULT_G): number {
  return r <= 0 ? 0 : Math.sqrt((2 * G * centralMass) / r);
}

/**
 * Give a body the velocity needed for a circular orbit around a central body.
 * The velocity is perpendicular to the separation vector.
 */
export function setCircularOrbit(
  satellite: Body,
  central: Body,
  G = DEFAULT_G,
  clockwise = false
): void {
  const dx = satellite.x - central.x;
  const dy = satellite.y - central.y;
  const r = Math.hypot(dx, dy);
  if (r < 1e-6) return;
  const v = circularSpeed(central.mass, r, G);
  const sign = clockwise ? -1 : 1;
  satellite.vx = central.vx + sign * (-dy / r) * v;
  satellite.vy = central.vy + sign * (dx / r) * v;
  satellite.vz = central.vz;
}

/**
 * Give a body a circular orbit in an arbitrary 3-D plane about a central body.
 * `normal` is the orbital plane's normal (defaults to +Z, i.e. the XY plane).
 */
export function setCircularOrbit3(
  satellite: Body,
  central: Body,
  normal: [number, number, number] = [0, 0, 1],
  G = DEFAULT_G
): void {
  const r: [number, number, number] = [
    satellite.x - central.x,
    satellite.y - central.y,
    satellite.z - central.z
  ];
  const dist = Math.hypot(r[0], r[1], r[2]);
  if (dist < 1e-6) return;

  const n = Math.hypot(normal[0], normal[1], normal[2]);
  const nx = normal[0] / n;
  const ny = normal[1] / n;
  const nz = normal[2] / n;

  // v̂ = n̂ × r̂  (perpendicular to both the radius and the plane normal)
  const vx = (ny * r[2] - nz * r[1]) / dist;
  const vy = (nz * r[0] - nx * r[2]) / dist;
  const vz = (nx * r[1] - ny * r[0]) / dist;

  const speed = circularSpeed(central.mass, dist, G);
  satellite.vx = central.vx + vx * speed;
  satellite.vy = central.vy + vy * speed;
  satellite.vz = central.vz + vz * speed;
}

/** Does the body escape the system given its energy? */
export function isBound(bodies: Body[], settings: GravitySettings = DEFAULT_GRAVITY): boolean {
  return totalEnergy(bodies, settings) < 0;
}
