/**
 * relativity.ts — special- and general-relativity corrections.
 *
 * These are lightweight approximations used to make the visuals interesting;
 * they are not a full geodesic integrator.
 */
import { C_LIGHT, DEFAULT_G } from './constants';
import type { Vec } from '../lib/mathx';
import { V } from '../lib/mathx';

/** Lorentz factor γ = 1 / sqrt(1 - v²/c²). */
export function lorentzFactor(v: number, c = C_LIGHT): number {
  const beta = Math.min(0.999999, Math.abs(v) / c);
  return 1 / Math.sqrt(1 - beta * beta);
}

/** Relativistic momentum p = γ m v. */
export function relativisticMomentum(mass: number, v: number, c = C_LIGHT): number {
  return lorentzFactor(v, c) * mass * v;
}

/** Relativistic kinetic energy (m c² (γ - 1)). */
export function relativisticKinetic(mass: number, v: number, c = C_LIGHT): number {
  return mass * c * c * (lorentzFactor(v, c) - 1);
}

/** Time dilation factor dt_local / dt_far. */
export function timeDilationFactor(v: number, c = C_LIGHT): number {
  return 1 / lorentzFactor(v, c);
}

/** Length contraction factor L / L₀. */
export function lengthContraction(v: number, c = C_LIGHT): number {
  return 1 / lorentzFactor(v, c);
}

/** Relativistic Doppler factor for a line-of-sight velocity. */
export function dopplerFactor(v: number, c = C_LIGHT): number {
  const beta = Math.max(-0.999, Math.min(0.999, v / c));
  return Math.sqrt((1 + beta) / (1 - beta));
}

/** Newtonian precession of a periapsis (radians per orbit). */
export function perihelionPrecession(
  semiMajor: number,
  eccentricity: number,
  mass: number,
  G = DEFAULT_G,
  c = C_LIGHT
): number {
  if (semiMajor <= 0) return 0;
  const a = semiMajor;
  const e = eccentricity;
  return (6 * Math.PI * G * mass) / (a * (1 - e * e) * c * c);
}

/**
 * GR acceleration correction (Einstein–Infeld–Hoffmann-like term).
 * Adds a 1/c² correction to the Newtonian acceleration toward a mass.
 */
export function grCorrection(
  pos: Vec,
  vel: Vec,
  mass: number,
  source: Vec,
  G = DEFAULT_G,
  c = C_LIGHT
): Vec {
  const r = V.sub(source, pos);
  const dist = V.len(r);
  if (dist < 1e-6) return V.zero(pos.length);

  const n = V.div(r, dist);
  const v2 = V.lenSq(vel);
  const c2 = c * c;

  // Schwarzschild-like correction: a_GR ≈ (GM/r²)( (4GM/(rc²)) - v²/c² ) n
  const gm = G * mass;
  const term = (4 * gm) / (dist * c2) - v2 / c2;
  const aNewton = gm / (dist * dist);
  return V.mul(n, aNewton * term);
}

/** Gravitational redshift z = 1/sqrt(1 - r_s/r) - 1. */
export function gravitationalRedshift(mass: number, r: number, G = DEFAULT_G, c = C_LIGHT): number {
  const rs = (2 * G * mass) / (c * c);
  if (r <= rs) return Infinity;
  return 1 / Math.sqrt(1 - rs / r) - 1;
}

/** Gravitational time dilation sqrt(1 - r_s/r). */
export function gravitationalTimeDilation(
  mass: number,
  r: number,
  G = DEFAULT_G,
  c = C_LIGHT
): number {
  const rs = (2 * G * mass) / (c * c);
  if (r <= rs) return 0;
  return Math.sqrt(1 - rs / r);
}

/** Total relativistic energy of a body. */
export function totalEnergy(mass: number, v: number, c = C_LIGHT): number {
  return lorentzFactor(v, c) * mass * c * c;
}

/** Lorentz-transform a 2-D velocity into a frame moving at vFrame (along x). */
export function lorentzTransformVelocity(
  vel: Vec,
  vFrame: number,
  c = C_LIGHT
): Vec {
  const beta = vFrame / c;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const vx = (vel[0] - vFrame) / (1 - (beta * vel[0]) / c);
  const vy = vel[1] / (gamma * (1 - (beta * vel[0]) / c));
  return [vx, vy];
}

/** Relativistic aberration of a direction given a boost. */
export function aberrate(direction: Vec, beta: number): Vec {
  const b = Math.max(-0.999, Math.min(0.999, beta));
  const theta = Math.atan2(direction[1], direction[0]);
  const cosTheta = Math.cos(theta);
  const denom = 1 + b * cosTheta;
  const cosPrime = (cosTheta + b) / denom;
  const angle = Math.acos(Math.max(-1, Math.min(1, cosPrime)));
  const sign = Math.sin(theta) >= 0 ? 1 : -1;
  return [Math.cos(angle), sign * Math.sin(angle)];
}
