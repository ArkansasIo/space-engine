/**
 * linalg3d.ts — 3-D vector algebra and rigid-body helpers.
 *
 * The 2-D `mathx.ts` module stays the numeric foundation for the flat/planar
 * fast path; this module adds the third axis used by systems, galaxies and the
 * universe scale. Conventions match `mathx.ts`: vectors are plain tuples and
 * every operation returns a new value (no in-place mutation).
 */
import { EPS, clamp } from './mathx';

/** Immutable 3-component vector. */
export type Vec3 = [number, number, number];

/* ------------------------------------------------------------- constructors */

export const v3 = (x = 0, y = 0, z = 0): Vec3 => [x, y, z];

export const ZERO3: Vec3 = [0, 0, 0];
export const UNIT_X: Vec3 = [1, 0, 0];
export const UNIT_Y: Vec3 = [0, 1, 0];
export const UNIT_Z: Vec3 = [0, 0, 1];

export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export const mul3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

export const neg3 = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];

export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Right-handed cross product. */
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];

export const len3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export const lenSq3 = (a: Vec3): number => a[0] * a[0] + a[1] * a[1] + a[2] * a[2];

/** Distance between two points. */
export const dist3 = (a: Vec3, b: Vec3): number => len3(sub3(a, b));

export function norm3(a: Vec3): Vec3 {
  const L = len3(a);
  return L < EPS ? [0, 0, 0] : [a[0] / L, a[1] / L, a[2] / L];
}

export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

/** Clamp a vector's magnitude to [lo, hi], preserving direction. */
export function clampMag3(a: Vec3, lo: number, hi: number): Vec3 {
  const L = len3(a);
  if (L < EPS) return [0, 0, 0];
  const c = clamp(L, lo, hi);
  return mul3(a, c / L);
}

/* -------------------------------------------------------------- orientation */

/** Spherical → cartesian. `theta` is the polar angle from +Z, `phi` the azimuth. */
export function sphericalToCartesian(r: number, theta: number, phi: number): Vec3 {
  const st = Math.sin(theta);
  return [r * st * Math.cos(phi), r * st * Math.sin(phi), r * Math.cos(theta)];
}

/** Cartesian → spherical `[r, theta, phi]` with theta in [0, π]. */
export function cartesianToSpherical(a: Vec3): Vec3 {
  const r = len3(a);
  if (r < EPS) return [0, 0, 0];
  return [r, Math.acos(clamp(a[2] / r, -1, 1)), Math.atan2(a[1], a[0])];
}

/**
 * Any unit vector perpendicular to `n` (used to build orbital baselines).
 * Picks the world axis least aligned with `n` to stay numerically stable.
 */
export function perpendicular3(n: Vec3): Vec3 {
  const u = norm3(n);
  const ax = Math.abs(u[0]);
  const ay = Math.abs(u[1]);
  const az = Math.abs(u[2]);
  const ref: Vec3 = ax <= ay && ax <= az ? UNIT_X : ay <= az ? UNIT_Y : UNIT_Z;
  return norm3(cross3(u, ref));
}

/** Build an orthonormal basis `{ u, v, w }` from a normal. */
export function basis3(normal: Vec3): { u: Vec3; v: Vec3; w: Vec3 } {
  const w = norm3(normal);
  const u = perpendicular3(w);
  const v = cross3(w, u);
  return { u, v, w };
}

/** Rotate `p` about `axis` (right-hand rule) by `angle` radians. */
export function rotateAxis3(p: Vec3, axis: Vec3, angle: number): Vec3 {
  const k = norm3(axis);
  if (len3(k) < EPS) return [p[0], p[1], p[2]];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // Rodrigues' rotation formula: p·c + (k × p)·s + k·(k · p)·(1 − c)
  const kxp = cross3(k, p);
  const kdp = dot3(k, p);
  return [
    p[0] * c + kxp[0] * s + k[0] * kdp * (1 - c),
    p[1] * c + kxp[1] * s + k[1] * kdp * (1 - c),
    p[2] * c + kxp[2] * s + k[2] * kdp * (1 - c)
  ];
}

/* ------------------------------------------------------------------ matrices */

/** Row-major 3×3 matrix. */
export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export const IDENTITY3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function matMul3(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9) as Mat3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

/** Apply a 3×3 matrix to a vector. */
export function applyMat3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
  ];
}

export function transpose3(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function det3(m: Mat3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/** Rotation matrix about an arbitrary axis. */
export function rotationMatrix3(axis: Vec3, angle: number): Mat3 {
  const [x, y, z] = norm3(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c
  ];
}

/** Scaling matrix. */
export const scalingMatrix3 = (sx: number, sy = sx, sz = sx): Mat3 => [
  sx, 0, 0,
  0, sy, 0,
  0, 0, sz
];

/* ---------------------------------------------------------------- statistics */

/** Mean position of a point cloud. */
export function centroid3(points: Vec3[]): Vec3 {
  if (!points.length) return [0, 0, 0];
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
    z += p[2];
  }
  const n = points.length;
  return [x / n, y / n, z / n];
}

/** Axis-aligned bounding box of a point cloud. */
export function bounds3(points: Vec3[]): { min: Vec3; max: Vec3; center: Vec3; size: Vec3 } {
  if (!points.length) {
    const z: Vec3 = [0, 0, 0];
    return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], size: z };
  }
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return {
    min,
    max,
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  };
}

/** Root-mean-square radius of a point cloud about its centroid. */
export function rmsRadius3(points: Vec3[], center?: Vec3): number {
  if (!points.length) return 0;
  const c = center ?? centroid3(points);
  let acc = 0;
  for (const p of points) {
    const d = sub3(p, c);
    acc += lenSq3(d);
  }
  return Math.sqrt(acc / points.length);
}

/* ------------------------------------------------------------------- orbits */

/**
 * Velocity for a circular orbit about `center` with the orbital plane's normal
 * given by `normal`. The speed comes from the caller so this stays unit-free.
 */
export function circularVelocity3(
  position: Vec3,
  center: Vec3,
  speed: number,
  normal: Vec3 = UNIT_Z
): Vec3 {
  const r = sub3(position, center);
  const n = norm3(normal);
  const dir = norm3(cross3(n, r));
  return mul3(dir, speed);
}

/** Gravitational parameter μ = G·M. */
export const mu = (G: number, mass: number): number => G * mass;

/** Circular orbital speed v = √(μ/r). */
export function orbitalSpeed3(G: number, mass: number, r: number): number {
  return r <= 0 ? 0 : Math.sqrt((G * mass) / r);
}

/**
 * Position on an ellipse at true anomaly `nu`, in the orbital plane spanned by
 * `eHat` (toward periapsis) and `pHat` (perpendicular, along motion).
 * `a` is the semi-major axis, `e` the eccentricity.
 */
export function ellipsePoint3(
  a: number,
  e: number,
  nu: number,
  eHat: Vec3,
  pHat: Vec3
): Vec3 {
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return add3(mul3(eHat, r * Math.cos(nu)), mul3(pHat, r * Math.sin(nu)));
}

/** Orbital period from Kepler's third law: T = 2π √(a³/μ). */
export function orbitalPeriod3(a: number, G: number, mass: number): number {
  const m = mu(G, mass);
  return m <= 0 ? Infinity : 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / m);
}

/** Specific orbital energy ε = v²/2 − μ/r (negative ⇒ bound). */
export function specificEnergy3(v: Vec3, r: Vec3, G: number, mass: number): number {
  const dist = len3(r);
  if (dist < EPS) return Infinity;
  return lenSq3(v) / 2 - mu(G, mass) / dist;
}

/** Eccentricity vector from the state vectors (points toward periapsis). */
export function eccentricityVector3(v: Vec3, r: Vec3, G: number, mass: number): Vec3 {
  const dist = len3(r);
  if (dist < EPS) return [0, 0, 0];
  const h = cross3(r, v);
  const vxh = cross3(v, h);
  return sub3(mul3(vxh, 1 / mu(G, mass)), norm3(r));
}
