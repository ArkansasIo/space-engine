/**
 * calculus.ts — differential & integral calculus toolkit.
 *
 * Numerical derivatives (forward / backward / central / Richardson), second
 * derivatives, gradients & Jacobians, definite integrals (trapezoid / Simpson /
 * adaptive Simpson / Gauss–Legendre / Romberg), arc length, ODE helpers,
 * partial derivatives and the classic gravitational-potential functions.
 */
import { V, S } from './mathx';
import type { Vec, Point2 } from './mathx';

export type ScalarFn = (x: number) => number;
export type VectorFn = (x: Vec) => Vec;
export type ScalarField = (x: Vec) => number;

/* ============================================================ DERIVATIVES */

/** Forward difference: (f(x+h) - f(x)) / h */
export const forwardDiff = (f: ScalarFn, x: number, h = 1e-6): number => (f(x + h) - f(x)) / h;

/** Backward difference: (f(x) - f(x-h)) / h */
export const backwardDiff = (f: ScalarFn, x: number, h = 1e-6): number => (f(x) - f(x - h)) / h;

/** Central difference: (f(x+h) - f(x-h)) / 2h — O(h^2) */
export const centralDiff = (f: ScalarFn, x: number, h = 1e-6): number =>
  (f(x + h) - f(x - h)) / (2 * h);

/** Five-point stencil: O(h^4) */
export const fivePointDiff = (f: ScalarFn, x: number, h = 1e-5): number =>
  (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);

/**
 * Richardson extrapolation over central differences — dramatically more
 * accurate for smooth f. Order doubles each level.
 */
export function richardsonDiff(f: ScalarFn, x: number, h = 1e-3, levels = 5): number {
  const R: number[][] = [];
  for (let i = 0; i < levels; i++) {
    const hi = h / Math.pow(2, i);
    R.push([(f(x + hi) - f(x - hi)) / (2 * hi)]);
  }
  for (let k = 1; k < levels; k++) {
    for (let i = levels - 1; i >= k; i--) {
      const p = Math.pow(4, k);
      R[i][k] = (p * R[i][k - 1] - R[i - 1][k - 1]) / (p - 1);
    }
  }
  return R[levels - 1][levels - 1];
}

/** Second derivative via central second difference, O(h^2). */
export const secondDiff = (f: ScalarFn, x: number, h = 1e-4): number =>
  (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);

/** Third derivative, O(h^2). */
export const thirdDiff = (f: ScalarFn, x: number, h = 1e-4): number =>
  (f(x + 2 * h) - 2 * f(x + h) + 2 * f(x - h) - f(x - 2 * h)) / (2 * h * h * h);

/** Numeric gradient of a scalar field f: R^n -> R. */
export function gradient(f: ScalarField, x: Vec, h = 1e-6): Vec {
  const n = x.length;
  const g = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const xp = x.slice();
    const xm = x.slice();
    xp[i] += h;
    xm[i] -= h;
    g[i] = (f(xp) - f(xm)) / (2 * h);
  }
  return g;
}

/** Jacobian matrix of a vector field F: R^n -> R^m (rows = outputs). */
export function jacobian(F: VectorFn, x: Vec, h = 1e-6): number[][] {
  const f0 = F(x);
  const m = f0.length;
  const n = x.length;
  const J = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) {
    const xp = x.slice();
    const xm = x.slice();
    xp[j] += h;
    xm[j] -= h;
    const fp = F(xp);
    const fm = F(xm);
    for (let i = 0; i < m; i++) J[i][j] = (fp[i] - fm[i]) / (2 * h);
  }
  return J;
}

/** Divergence of F: R^n -> R^n. */
export function divergence(F: VectorFn, x: Vec, h = 1e-6): number {
  let d = 0;
  for (let i = 0; i < x.length; i++) {
    const xp = x.slice();
    const xm = x.slice();
    xp[i] += h;
    xm[i] -= h;
    d += (F(xp)[i] - F(xm)[i]) / (2 * h);
  }
  return d;
}

/** Curl of a 3-D field (returns the full curl vector). */
export function curl3(F: VectorFn, x: Vec, h = 1e-6): Vec {
  const px = (i: number, s: number): Vec => {
    const a = x.slice();
    a[i] += s * h;
    return a;
  };
  const dF = (o: number, i: number): number => (F(px(i, 1))[o] - F(px(i, -1))[o]) / (2 * h);
  return [dF(2, 1) - dF(1, 2), dF(0, 2) - dF(2, 0), dF(1, 0) - dF(0, 1)];
}

/** Partial derivative of a multivariate f w.r.t. index i. */
export function partial(f: ScalarField, x: Vec, i: number, h = 1e-6): number {
  const xp = x.slice();
  const xm = x.slice();
  xp[i] += h;
  xm[i] -= h;
  return (f(xp) - f(xm)) / (2 * h);
}

/** Tangent line at x0, returned as a function of x. */
export function tangentLine(f: ScalarFn, x0: number, h = 1e-6): ScalarFn {
  const slope = centralDiff(f, x0, h);
  const y0 = f(x0);
  return (x: number) => y0 + slope * (x - x0);
}

export type DerivativeMethod = 'forward' | 'backward' | 'central' | 'fivePoint' | 'richardson';

export interface DerivativeOptions {
  h?: number;
  method?: DerivativeMethod;
  levels?: number;
}

/** Numeric derivative wrapped as a function. */
export function derivative(f: ScalarFn, opts: DerivativeOptions = {}): ScalarFn {
  const h = opts.h ?? 1e-6;
  const method = opts.method ?? 'central';
  const table: Record<DerivativeMethod, ScalarFn> = {
    forward: (x) => forwardDiff(f, x, h),
    backward: (x) => backwardDiff(f, x, h),
    central: (x) => centralDiff(f, x, h),
    fivePoint: (x) => fivePointDiff(f, x, h),
    richardson: (x) => richardsonDiff(f, x, opts.h ?? 1e-3, opts.levels ?? 5)
  };
  return table[method] ?? table.central;
}

/* ========================================================== INTEGRALS */

/** Composite trapezoid rule on [a,b]. */
export function trapz(f: ScalarFn, a: number, b: number, n = 512): number {
  if (n < 1) n = 1;
  const h = (b - a) / n;
  let s = 0.5 * (f(a) + f(b));
  for (let i = 1; i < n; i++) s += f(a + i * h);
  return s * h;
}

/** Trapezoid on a sampled data array (x may be non-uniform or omitted). */
export function trapzData(ys: number[], xs: number[] | null = null): number {
  let s = 0;
  for (let i = 1; i < ys.length; i++) {
    const dx = xs ? xs[i] - xs[i - 1] : 1;
    s += 0.5 * (ys[i] + ys[i - 1]) * dx;
  }
  return s;
}

/** Simpson's rule; falls back to trapezoid for odd intervals. */
export function simpson(f: ScalarFn, a: number, b: number, n = 512): number {
  if (n % 2 !== 0) n += 1;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Simpson 3/8 rule (n multiple of 3). */
export function simpson38(f: ScalarFn, a: number, b: number, n = 513): number {
  if (n % 3 !== 0) n += 3 - (n % 3);
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const w = i % 3 === 0 ? 2 : 3;
    s += w * f(a + i * h);
  }
  return (3 * s * h) / 8;
}

/** Adaptive Simpson with relative tolerance. */
export function adaptiveSimpson(
  f: ScalarFn,
  a: number,
  b: number,
  tol = 1e-8,
  maxDepth = 24
): number {
  const Sf = (a2: number, b2: number): number => {
    const m = 0.5 * (a2 + b2);
    return ((b2 - a2) / 6) * (f(a2) + 4 * f(m) + f(b2));
  };
  const rec = (a2: number, b2: number, whole: number, depth: number): number => {
    const m = 0.5 * (a2 + b2);
    const left = Sf(a2, m);
    const right = Sf(m, b2);
    const delta = left + right - whole;
    if (depth <= 0 || Math.abs(delta) <= 15 * tol) {
      return left + right + delta / 15;
    }
    return rec(a2, m, left, depth - 1) + rec(m, b2, right, depth - 1);
  };
  return rec(a, b, Sf(a, b), maxDepth);
}

/* --- Gauss–Legendre: nodes/weights generated numerically (Newton on P_n) */

interface GLNodes {
  xs: number[];
  ws: number[];
}

const _glCache = new Map<number, GLNodes>();

function gaussLegendre(n: number): GLNodes {
  const cached = _glCache.get(n);
  if (cached) return cached;
  const xs = new Array<number>(n);
  const ws = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    // initial guess: Chebyshev-like
    let x = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let dp = 0;
    for (let it = 0; it < 100; it++) {
      // Legendre P_n via recurrence
      let p0 = 1;
      let p1 = x;
      for (let k = 2; k <= n; k++) {
        const pk = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
        p0 = p1;
        p1 = pk;
      }
      dp = (n * (x * p1 - p0)) / (x * x - 1);
      const dx = p1 / dp;
      x -= dx;
      if (Math.abs(dx) < 1e-15) break;
    }
    xs[i] = x;
    ws[i] = 2 / ((1 - x * x) * dp * dp);
  }
  const out = { xs, ws };
  _glCache.set(n, out);
  return out;
}

/** Gauss–Legendre quadrature — exact for polynomials up to degree 2n-1. */
export function gaussQuad(f: ScalarFn, a: number, b: number, n = 16): number {
  const { xs, ws } = gaussLegendre(n);
  const c = 0.5 * (b - a);
  const mid = 0.5 * (a + b);
  let s = 0;
  for (let i = 0; i < n; i++) s += ws[i] * f(mid + c * xs[i]);
  return s * c;
}

/** Romberg integration using successive trapezoid refinements. */
export function romberg(f: ScalarFn, a: number, b: number, levels = 8): number {
  const R: number[][] = [];
  for (let i = 0; i < levels; i++) {
    const n = Math.pow(2, i);
    R.push([trapz(f, a, b, n)]);
  }
  for (let k = 1; k < levels; k++) {
    for (let i = levels - 1; i >= k; i--) {
      const p = Math.pow(4, k);
      R[i][k] = (p * R[i][k - 1] - R[i - 1][k - 1]) / (p - 1);
    }
  }
  return R[levels - 1][levels - 1];
}

/** Improper integral over [a, inf) via substitution t in [0,1]. */
export function integrateToInfinity(f: ScalarFn, a: number, n = 512): number {
  return trapz(
    (t) => {
      const x = a + t / (1 - t);
      return f(x) / ((1 - t) * (1 - t));
    },
    0,
    1 - 1e-9,
    n
  );
}

/** Integral of sampled y over sampled x (trapezoid accumulation). */
export function cumulativeIntegral(ys: number[], xs: number[]): number[] {
  const n = ys.length;
  const out = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const dx = xs[i] - xs[i - 1];
    out[i] = out[i - 1] + 0.5 * (ys[i] + ys[i - 1]) * dx;
  }
  return out;
}

/* ======================================================= GEOMETRY / ARC */

/** Arc length of y=f(x) on [a,b]. */
export function arcLength(f: ScalarFn, a: number, b: number, n = 512): number {
  const df = derivative(f, { method: 'central' });
  return simpson((x) => Math.sqrt(1 + df(x) * df(x)), a, b, n);
}

/** Arc length of a parametric curve r(t) = [x(t), y(t)] on [t0,t1]. */
export function arcLengthParametric(
  r: (t: number) => Vec,
  t0: number,
  t1: number,
  n = 512
): number {
  const h = (t1 - t0) / n;
  const speed = (t: number): number => {
    const p1 = r(t + h * 0.5);
    const p0 = r(t - h * 0.5);
    return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / h;
  };
  return simpson(speed, t0, t1, n);
}

/** Area between two curves on [a,b]; positive where f > g. */
export const areaBetween = (
  f: ScalarFn,
  g: ScalarFn,
  a: number,
  b: number,
  n = 512
): number => simpson((x) => f(x) - g(x), a, b, n);

/** Signed area enclosed by a closed polyline (shoelace formula). */
export function shoelace(pts: Point2[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}

/** Volume of revolution about the x-axis, disk method. */
export const volumeOfRevolution = (f: ScalarFn, a: number, b: number, n = 512): number =>
  simpson((x) => Math.PI * f(x) * f(x), a, b, n);

/** Surface area of revolution about the x-axis. */
export function surfaceOfRevolution(f: ScalarFn, a: number, b: number, n = 512): number {
  const df = derivative(f);
  return simpson((x) => 2 * Math.PI * f(x) * Math.sqrt(1 + df(x) ** 2), a, b, n);
}

/* ================================================= SERIES / LIMITS / ODE */

/** Taylor coefficients of f about x0 up to order n. */
export function taylorCoefficients(f: ScalarFn, x0: number, n = 5): number[] {
  const facts = [1];
  for (let i = 1; i <= n; i++) facts[i] = facts[i - 1] * i;
  const out = [f(x0)];
  let g = f;
  for (let k = 1; k <= n; k++) {
    g = derivative(g, { method: 'central', h: 1e-4 });
    out.push(g(x0) / facts[k]);
  }
  return out;
}

/** Evaluate a Taylor polynomial from precomputed coefficients. */
export function evalTaylor(coeffs: number[], x0: number, x: number): number {
  let s = 0;
  for (let k = coeffs.length - 1; k >= 0; k--) s = s * (x - x0) + coeffs[k];
  return s;
}

/** Numeric limit f(x) as x -> x0 (two-sided if side not provided). */
export function limit(f: ScalarFn, x0: number, side = 0, eps = 1e-7): number {
  if (side < 0) return f(x0 - eps);
  if (side > 0) return f(x0 + eps);
  return 0.5 * (f(x0 - eps) + f(x0 + eps));
}

/** Does the sequence a_n converge? Returns estimated limit + residual. */
export function sequenceLimit(a: (n: number) => number, N = 400): { limit: number; residual: number } {
  let prev = a(N);
  let last = a(N + 1);
  for (let k = N + 1; k < N + 200; k++) {
    const v = a(k);
    if (Math.abs(v - prev) < 1e-12) break;
    prev = last;
    last = v;
  }
  return { limit: last, residual: Math.abs(last - prev) };
}

/** Euler's method for y' = g(t,y). Returns [t, y] samples. */
export function euler(
  g: (t: number, y: Vec) => Vec,
  y0: Vec,
  t0: number,
  t1: number,
  steps = 1000
): Array<[number, Vec]> {
  const h = (t1 - t0) / steps;
  let t = t0;
  let y = y0.slice();
  const pts: Array<[number, Vec]> = [[t, y.slice()]];
  for (let i = 0; i < steps; i++) {
    const d = g(t, y);
    y = V.madd(y.slice(), d, h);
    t += h;
    pts.push([t, y.slice()]);
  }
  return pts;
}

/** Work done by force F over a straight path from p0 to p1. */
export function workLine(F: (p: Vec) => Vec, p0: Vec, p1: Vec, n = 128): number {
  const h = 1 / n;
  let w = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * h;
    const p = V.linComb([1 - t, t], [p0, p1]);
    const d = V.sub(p1, p0);
    w += V.dot(F(p), d) * h;
  }
  return w;
}

/* =========================================== gravitational-potential field */

/**
 * Newtonian gravitational potential at point p from a set of masses.
 * φ(p) = -G Σ m_i / |p - p_i|
 */
export function gravityPotential(
  p: Vec,
  masses: number[],
  positions: Vec[],
  G = 1,
  softening = 1e-6
): number {
  let phi = 0;
  for (let i = 0; i < masses.length; i++) {
    const r = Math.sqrt(V.distSq(p, positions[i]) + softening * softening);
    phi -= (G * masses[i]) / r;
  }
  return phi;
}

/** Gravitational field (acceleration) at p: -∇φ. */
export function gravityField(
  p: Vec,
  masses: number[],
  positions: Vec[],
  G = 1,
  softening = 1e-6
): Vec {
  const acc = V.zero(p.length);
  for (let i = 0; i < masses.length; i++) {
    const d = V.sub(positions[i], p);
    const r2 = V.lenSq(d) + softening * softening;
    const invR3 = 1 / (r2 * Math.sqrt(r2));
    V.madd(acc, d, (G * masses[i]) * invR3);
  }
  return acc;
}

/** Mean value of a sampled function (uses the trapezoid rule). */
export function meanValue(ys: number[], xs: number[]): number {
  if (ys.length < 2) return 0;
  const area = trapzData(ys, xs);
  const span = xs[xs.length - 1] - xs[0];
  return span === 0 ? 0 : area / span;
}

/** Root-mean-square of a sampled series. */
export const rms = (ys: number[]): number => Math.sqrt(S.mean(ys.map((y) => y * y)));
