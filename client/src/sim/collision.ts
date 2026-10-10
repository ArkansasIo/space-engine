/**
 * collision.ts — collision detection and resolution.
 */
import { COLLISION_RESTITUTION, COLLISION_MERGE_FACTOR } from './constants';
import type { Body } from './body';

export interface CollisionPair {
  a: Body;
  b: Body;
  overlap: number;
}

/** Find every overlapping pair (ignores fixed/immaterial bodies). */
export function detect(bodies: Body[]): CollisionPair[] {
  const pairs: CollisionPair[] = [];
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (!b.alive) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dy, dz);
      const rSum = a.radius + b.radius;
      if (d < rSum) pairs.push({ a, b, overlap: rSum - d });
    }
  }
  return pairs;
}

/** Elastic-ish bounce between two bodies. */
export function bounce(a: Body, b: Body): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dy, dz);
  if (d < 1e-9) return;

  const nx = dx / d;
  const ny = dy / d;
  const nz = dz / d;

  // Relative velocity along the normal
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const rvz = b.vz - a.vz;
  const vn = rvx * nx + rvy * ny + rvz * nz;
  if (vn > 0) return; // already separating

  const invMa = a.fixed ? 0 : 1 / a.mass;
  const invMb = b.fixed ? 0 : 1 / b.mass;
  const invSum = invMa + invMb;
  if (invSum === 0) return;

  const jImp = (-(1 + COLLISION_RESTITUTION) * vn) / invSum;

  a.vx -= jImp * invMa * nx;
  a.vy -= jImp * invMa * ny;
  a.vz -= jImp * invMa * nz;
  b.vx += jImp * invMb * nx;
  b.vy += jImp * invMb * ny;
  b.vz += jImp * invMb * nz;

  // Positional correction to remove overlap
  const overlap = a.radius + b.radius - d;
  const push = overlap / invSum;
  a.x -= push * invMa * nx;
  a.y -= push * invMa * ny;
  a.z -= push * invMa * nz;
  b.x += push * invMb * nx;
  b.y += push * invMb * ny;
  b.z += push * invMb * nz;
}

/**
 * Merge b into a (perfectly inelastic). Momentum and mass are conserved;
 * the surviving body keeps a's identity but takes the combined properties.
 */
export function merge(a: Body, b: Body): Body {
  const totalMass = a.mass + b.mass;
  if (totalMass <= 0) return a;

  a.vx = (a.mass * a.vx + b.mass * b.vx) / totalMass;
  a.vy = (a.mass * a.vy + b.mass * b.vy) / totalMass;
  a.vz = (a.mass * a.vz + b.mass * b.vz) / totalMass;
  a.x = (a.mass * a.x + b.mass * b.x) / totalMass;
  a.y = (a.mass * a.y + b.mass * b.y) / totalMass;
  a.z = (a.mass * a.z + b.mass * b.z) / totalMass;
  a.mass = totalMass;
  a.radius = Math.sqrt(a.radius * a.radius + b.radius * b.radius) * COLLISION_MERGE_FACTOR;
  a.luminosity += b.luminosity;
  a.temperature = Math.max(a.temperature, b.temperature);

  // Promote to a black hole if the merged mass is extreme and dense.
  if (a.kind === 'neutron' && totalMass > 100000) a.kind = 'blackhole';

  b.alive = false;
  return a;
}

export type CollisionMode = 'bounce' | 'merge' | 'none';

/** Resolve every collision in the scene according to the chosen mode. */
export function resolve(bodies: Body[], mode: CollisionMode = 'merge'): number {
  if (mode === 'none') return 0;
  const pairs = detect(bodies);
  let handled = 0;
  for (const { a, b } of pairs) {
    if (!a.alive || !b.alive) continue;
    if (mode === 'merge') merge(a, b);
    else bounce(a, b);
    handled++;
  }
  return handled;
}

/** Remove dead bodies, returning the survivors. */
export function prune(bodies: Body[]): Body[] {
  return bodies.filter((b) => b.alive);
}
