/**
 * photonsphere.ts — photon-ring / light-bending geometry around a black hole.
 */
import { C_LIGHT, DEFAULT_G } from './constants';

/**
 * Deflection angle of a light ray passing at impact parameter b:
 *   α = 4 G M / (c² b)
 * (small-angle approximation).
 */
export function deflectionAngle(
  mass: number,
  impactParameter: number,
  G = DEFAULT_G,
  c = C_LIGHT
): number {
  if (impactParameter <= 0) return Infinity;
  return (4 * G * mass) / (c * c * impactParameter);
}

/** Einstein ring radius for a source–lens–observer geometry. */
export function einsteinRadius(
  mass: number,
  dLens: number,
  dSource: number,
  G = DEFAULT_G,
  c = C_LIGHT
): number {
  if (dLens <= 0 || dSource <= dLens) return 0;
  const dLS = dSource - dLens;
  return Math.sqrt((4 * G * mass * dLS) / (c * c * dLens * dSource));
}

/** Critical impact parameter of the photon sphere: b_c = 3√3 GM/c². */
export function criticalImpactParameter(mass: number, G = DEFAULT_G, c = C_LIGHT): number {
  return (3 * Math.sqrt(3) * G * mass) / (c * c);
}

/** Is a ray at impact parameter b captured by the hole? */
export function isCaptured(mass: number, impactParameter: number, G = DEFAULT_G, c = C_LIGHT): boolean {
  return impactParameter < criticalImpactParameter(mass, G, c);
}

/**
 * Bend a photon velocity vector by the gravitational field of a mass.
 * Returns the updated direction (unit vector).
 */
export function bendDirection(
  px: number,
  py: number,
  vx: number,
  vy: number,
  mass: number,
  G = DEFAULT_G,
  c = C_LIGHT
): [number, number] {
  const r = Math.hypot(px, py);
  if (r < 1e-6) return [vx, vy];
  const alpha = deflectionAngle(mass, r, G, c);
  // Rotate the velocity toward the mass by the deflection angle.
  const toMassX = -px / r;
  const toMassY = -py / r;
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);
  // component along velocity (v-hat) and perpendicular (n-hat)
  const speed = Math.hypot(vx, vy) || 1;
  const vhx = vx / speed;
  const vhy = vy / speed;
  const dot = vhx * toMassX + vhy * toMassY;
  const perpX = toMassX - dot * vhx;
  const perpY = toMassY - dot * vhy;
  const perpLen = Math.hypot(perpX, perpY) || 1;
  const nx = perpX / perpLen;
  const ny = perpY / perpLen;
  return [vhx * cosA + nx * sinA, vhy * cosA + ny * sinA];
}

/** Apparent angular size of the photon ring for an observer at distance d. */
export function photonRingAngularRadius(mass: number, d: number, G = DEFAULT_G, c = C_LIGHT): number {
  if (d <= 0) return 0;
  const bc = criticalImpactParameter(mass, G, c);
  return Math.asin(Math.min(1, bc / d));
}

/** Shapiro delay for a signal grazing a mass at distance r. */
export function shapiroDelay(
  mass: number,
  r: number,
  G = DEFAULT_G,
  c = C_LIGHT
): number {
  if (r <= 0) return 0;
  return (2 * G * mass / (c * c * c)) * Math.log((4 * r * r) / (r * r));
}

/** Number of photon orbits possible at a given radius (heuristic for UI). */
export function orbitCount(radius: number, photonSphere: number): number {
  if (radius <= photonSphere) return Infinity;
  return Math.floor((2 * Math.PI * radius) / (2 * Math.PI * photonSphere));
}
