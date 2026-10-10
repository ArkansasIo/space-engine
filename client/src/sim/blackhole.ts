/**
 * blackhole.ts — Schwarzschild / Kerr geometry helpers.
 *
 * All lengths are in "simulation units"; mass is scaled by G/c² internally.
 */
import { C_LIGHT, DEFAULT_G } from './constants';

export interface BlackHoleGeometry {
  rs: number;
  photonSphere: number;
  isco: number;
  shadowRadius: number;
  hawkingTemperature: number;
  evaporationYears: number;
}

/** Schwarzschild radius r_s = 2 G M / c². */
export function schwarzschildRadius(mass: number, G = DEFAULT_G, c = C_LIGHT): number {
  return (2 * G * mass) / (c * c);
}

/** Photon sphere at 1.5 r_s. */
export function photonSphereRadius(mass: number, G = DEFAULT_G, c = C_LIGHT): number {
  return 1.5 * schwarzschildRadius(mass, G, c);
}

/** Innermost stable circular orbit (Schwarzschild): 3 r_s. */
export function iscoRadius(mass: number, G = DEFAULT_G, c = C_LIGHT): number {
  return 3 * schwarzschildRadius(mass, G, c);
}

/** Apparent shadow radius: 3√3/2 · r_s ≈ 2.598 r_s. */
export function shadowRadius(mass: number, G = DEFAULT_G, c = C_LIGHT): number {
  return (3 * Math.sqrt(3) / 2) * schwarzschildRadius(mass, G, c);
}

/**
 * Hawking temperature T = ħc³ / (8πGMk_B).
 * @param massKg mass in kilograms
 */
export function hawkingTemperature(massKg: number): number {
  const hbar = 1.054571817e-34;
  const G = 6.6743e-11;
  const kB = 1.380649e-23;
  return (hbar * Math.pow(C_LIGHT, 3)) / (8 * Math.PI * G * massKg * kB);
}

/**
 * Evaporation time t = 5120 π G² M³ / (ħ c⁴) seconds.
 * @param massKg mass in kilograms
 */
export function evaporationTime(massKg: number): number {
  const hbar = 1.054571817e-34;
  const G = 6.6743e-11;
  return (5120 * Math.PI * G * G * Math.pow(massKg, 3)) / (hbar * Math.pow(C_LIGHT, 4));
}

/** Kerr ergosphere radius at the equator: r_E = r_s (for a=0, grows with spin). */
export function ergosphereRadius(mass: number, spin: number, G = DEFAULT_G, c = C_LIGHT): number {
  const rs = schwarzschildRadius(mass, G, c);
  const a = Math.min(0.999, Math.abs(spin));
  return rs * (1 + Math.sqrt(Math.max(0, 1 - a * a)) * 0 + a);
}

/** Orbital speed at radius r around a mass (Newtonian approximation). */
export function orbitalSpeed(mass: number, r: number, G = DEFAULT_G): number {
  return r <= 0 ? 0 : Math.sqrt((G * mass) / r);
}

/** Gravitational time-dilation factor sqrt(1 - r_s/r), clamped to [0,1]. */
export function timeDilation(mass: number, r: number, G = DEFAULT_G, c = C_LIGHT): number {
  const rs = schwarzschildRadius(mass, G, c);
  if (r <= rs) return 0;
  return Math.sqrt(1 - rs / r);
}

/** Tidal acceleration across a separation Δr at distance r. */
export function tidalAcceleration(mass: number, r: number, dr: number, G = DEFAULT_G): number {
  return (2 * G * mass * dr) / Math.pow(Math.max(r, 1e-6), 3);
}

/** Full geometry bundle for a black hole of the given simulation mass. */
export function geometry(mass: number, spin = 0): BlackHoleGeometry {
  const rs = schwarzschildRadius(mass);
  // Treat the simulation mass as if it were in "solar mass" units scaled to kg.
  const massKg = mass * 1.989e30;
  return {
    rs,
    photonSphere: 1.5 * rs,
    isco: 3 * rs,
    shadowRadius: (3 * Math.sqrt(3) / 2) * rs,
    hawkingTemperature: hawkingTemperature(massKg) * (1 - Math.min(1, Math.abs(spin))),
    evaporationYears: evaporationTime(massKg) / (3600 * 24 * 365.25)
  };
}
