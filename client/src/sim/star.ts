/**
 * star.ts — stellar physics helpers: mass–luminosity, radii, fusion life.
 */
import { C_LIGHT } from './constants';

export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StarProfile {
  cls: StarClass;
  temperature: number;
  luminosity: number;
  radius: number;
  color: string;
  lifetimeYears: number;
}

/** Rough main-sequence radius from mass (solar masses -> solar radii). */
export function radiusFromMass(massSolar: number): number {
  if (massSolar <= 0) return 0.1;
  if (massSolar < 0.43) return 0.5 * massSolar;
  if (massSolar < 1) return Math.pow(massSolar, 0.8);
  if (massSolar < 20) return Math.pow(massSolar, 0.57);
  return 1.6 * Math.pow(massSolar, 0.4);
}

/** Mass–luminosity relation: L ∝ M^3.5 for the main sequence. */
export function luminosityFromMass(massSolar: number): number {
  if (massSolar <= 0) return 0;
  if (massSolar < 0.43) return 0.23 * Math.pow(massSolar, 2.3);
  if (massSolar < 2) return Math.pow(massSolar, 4);
  if (massSolar < 20) return 1.5 * Math.pow(massSolar, 3.5);
  return 3200 * Math.pow(massSolar, 1.6);
}

/** Stefan–Boltzmann: T = (L / (4πR²σ))^¼ in arbitrary units. */
export function temperatureFrom(massSolar: number): number {
  const L = luminosityFromMass(massSolar);
  const R = radiusFromMass(massSolar);
  const sigma = 5.67e-8;
  return Math.pow(L / (4 * Math.PI * R * R * sigma), 0.25);
}

/** Approximate blackbody colour for a temperature in Kelvin. */
export function colorFromTemperature(kelvin: number): string {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332);
    g = 288.12 * Math.pow(t - 60, -0.0755);
  }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.52 * Math.log(t - 10) - 305.04;

  const c = (v: number): number => Math.round(Math.min(255, Math.max(0, v)));
  const hex = (v: number): string => c(v).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Spectral class from mass (solar masses). */
export function classify(massSolar: number): StarClass {
  if (massSolar >= 16) return 'O';
  if (massSolar >= 2.1) return 'B';
  if (massSolar >= 1.4) return 'A';
  if (massSolar >= 1.04) return 'F';
  if (massSolar >= 0.8) return 'G';
  if (massSolar >= 0.45) return 'K';
  return 'M';
}

/** Fusion lifetime in years, t ≈ 10 Gyr · M / L. */
export function lifetimeYears(massSolar: number): number {
  const L = luminosityFromMass(massSolar);
  return L > 0 ? (1e10 * massSolar) / L : Infinity;
}

/** Full profile for a star of the given solar mass. */
export function profile(massSolar: number): StarProfile {
  const cls = classify(massSolar);
  const temperature = temperatureFrom(massSolar);
  return {
    cls,
    temperature,
    luminosity: luminosityFromMass(massSolar),
    radius: radiusFromMass(massSolar),
    color: colorFromTemperature(temperature),
    lifetimeYears: lifetimeYears(massSolar)
  };
}

/** Eddington luminosity (erg/s) for a given solar mass. */
export function eddingtonLuminosity(massSolar: number): number {
  return 1.26e38 * massSolar;
}

/** Schwarzschild radius (km) of a mass in solar masses. */
export function schwarzschildKm(massSolar: number): number {
  return 2.95 * massSolar;
}

/** Photon-sphere radius as a fraction of the Schwarzschild radius (1.5 r_s). */
export function photonSphereRadius(massKg: number): number {
  const rs = (2 * 6.674e-11 * massKg) / (C_LIGHT * C_LIGHT);
  return 1.5 * rs;
}
