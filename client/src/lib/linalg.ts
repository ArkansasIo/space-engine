/**
 * linalg.ts — linear algebra.
 *
 * Matrices are arrays of row arrays. Small sizes only; clarity over speed.
 * Includes: basic ops, transpose, determinant (LU), inverse, solve,
 * LU/QR/Cholesky, power iteration for eigenpairs, 2x2/3x3 helpers
 * (needed for the relativistic photon integrator) and rotation matrices.
 */
import { V, S } from './mathx';
import type { Vec } from './mathx';

export type Matrix = number[][];

/* --------------------------------------------------------------- creation */

export const zeros = (r: number, c: number): Matrix =>
  Array.from({ length: r }, () => new Array<number>(c).fill(0));

export const identity = (n: number): Matrix =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

export function fromDiag(d: number[]): Matrix {
  const n = d.length;
  const m = zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = d[i];
  return m;
}

export const clone = (A: Matrix): Matrix => A.map((row) => row.slice());

export const dim = (A: Matrix): { rows: number; cols: number } => ({
  rows: A.length,
  cols: A[0] ? A[0].length : 0
});

/* ------------------------------------------------------------ elementwise */

export const add = (A: Matrix, B: Matrix): Matrix =>
  A.map((row, i) => row.map((v, j) => v + B[i][j]));

export const sub = (A: Matrix, B: Matrix): Matrix =>
  A.map((row, i) => row.map((v, j) => v - B[i][j]));

export const scale = (A: Matrix, s: number): Matrix => A.map((row) => row.map((v) => v * s));

export const hadamard = (A: Matrix, B: Matrix): Matrix =>
  A.map((row, i) => row.map((v, j) => v * B[i][j]));

export const transpose = (A: Matrix): Matrix => A[0].map((_, j) => A.map((row) => row[j]));

/** Matrix product A (m x n) * B (n x p). */
export function mul(A: Matrix, B: Matrix): Matrix {
  const m = A.length;
  const n = B.length;
  const p = B[0].length;
  const out = zeros(m, p);
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      const brow = B[k];
      for (let j = 0; j < p; j++) out[i][j] += a * brow[j];
    }
  }
  return out;
}

/** Matrix * column vector. */
export const mulVec = (A: Matrix, v: Vec): Vec =>
  A.map((row) => {
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j] * v[j];
    return s;
  });

/** Row vector * matrix. */
export function vecMul(v: Vec, A: Matrix): Vec {
  const p = A[0].length;
  const out = new Array<number>(p).fill(0);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < p; j++) out[j] += v[i] * A[i][j];
  }
  return out;
}

export const outer = (a: Vec, b: Vec): Matrix => a.map((ai) => b.map((bj) => ai * bj));

export const trace = (A: Matrix): number => A.reduce((s, row, i) => s + row[i], 0);

export const normFro = (A: Matrix): number =>
  Math.sqrt(A.reduce((s, row) => s + row.reduce((t, v) => t + v * v, 0), 0));

export const equals = (A: Matrix, B: Matrix, tol = 1e-9): boolean =>
  A.length === B.length &&
  A.every(
    (row, i) => row.length === B[i].length && row.every((v, j) => Math.abs(v - B[i][j]) < tol)
  );

/* ------------------------------------------------------------- LU / solve */

export interface LUResult {
  LU: Matrix;
  piv: number[];
  sign: number;
  singular: boolean;
}

/** LU decomposition with partial pivoting. */
export function luDecompose(A: Matrix): LUResult {
  const n = A.length;
  const M = clone(A);
  const piv = Array.from({ length: n }, (_, i) => i);
  let sign = 1;
  let singular = false;

  for (let k = 0; k < n; k++) {
    let p = k;
    let max = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) {
        max = v;
        p = i;
      }
    }
    if (max < 1e-14) {
      singular = true;
      continue;
    }
    if (p !== k) {
      [M[p], M[k]] = [M[k], M[p]];
      [piv[p], piv[k]] = [piv[k], piv[p]];
      sign = -sign;
    }
    const pivot = M[k][k];
    for (let i = k + 1; i < n; i++) {
      M[i][k] /= pivot;
      const f = M[i][k];
      for (let j = k + 1; j < n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return { LU: M, piv, sign, singular };
}

export function det(A: Matrix): number {
  const n = A.length;
  if (n === 0) return 1;
  if (n === 1) return A[0][0];
  if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (n === 3) {
    const [a, b, c] = A[0];
    const [d, e, f] = A[1];
    const [g, h, i] = A[2];
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }
  const { LU, sign, singular } = luDecompose(A);
  if (singular) return 0;
  let d = sign;
  for (let i = 0; i < n; i++) d *= LU[i][i];
  return d;
}

/** Solve A x = b using LU with partial pivoting. */
export function solve(A: Matrix, b: Vec): Vec | null {
  const n = A.length;
  const { LU, piv, singular } = luDecompose(A);
  if (singular) return null;

  const y = new Array<number>(n);
  for (let i = 0; i < n; i++) y[i] = b[piv[i]];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) y[i] -= LU[i][j] * y[j];
  }

  const x = new Array<number>(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= LU[i][j] * x[j];
    x[i] = s / LU[i][i];
  }
  return x;
}

/** Matrix inverse via Gauss–Jordan with partial pivoting. */
export function inverse(A: Matrix): Matrix | null {
  const n = A.length;
  const M = A.map((row, i) =>
    row.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  );

  for (let k = 0; k < n; k++) {
    let p = k;
    let max = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i][k]);
      if (v > max) {
        max = v;
        p = i;
      }
    }
    if (max < 1e-14) return null;
    if (p !== k) [M[p], M[k]] = [M[k], M[p]];

    const d = M[k][k];
    for (let j = 0; j < 2 * n; j++) M[k][j] /= d;

    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const f = M[i][k];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return M.map((row) => row.slice(n));
}

export function rank(A: Matrix): number {
  const M = clone(A);
  const rows = M.length;
  const cols = M[0].length;
  let rk = 0;
  for (let c = 0, r = 0; c < cols && r < rows; c++) {
    let p = r;
    let max = Math.abs(M[r][c]);
    for (let i = r + 1; i < rows; i++) {
      if (Math.abs(M[i][c]) > max) {
        max = Math.abs(M[i][c]);
        p = i;
      }
    }
    if (max < 1e-12) continue;
    [M[p], M[r]] = [M[r], M[p]];
    for (let i = r + 1; i < rows; i++) {
      const f = M[i][c] / M[r][c];
      for (let j = c; j < cols; j++) M[i][j] -= f * M[r][j];
    }
    r++;
    rk++;
  }
  return rk;
}

/* ------------------------------------------------------- decompositions */

/** Cholesky A = L Lᵀ for symmetric positive-definite A. */
export function cholesky(A: Matrix): Matrix | null {
  const n = A.length;
  const Lm = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k];
      if (i === j) {
        if (s <= 0) return null;
        Lm[i][i] = Math.sqrt(s);
      } else {
        Lm[i][j] = s / Lm[j][j];
      }
    }
  }
  return Lm;
}

/** Gram–Schmidt QR decomposition. */
export function qr(A: Matrix): { Q: Matrix; R: Matrix } {
  const m = A.length;
  const n = A[0].length;
  let Q = zeros(m, n);
  const R = zeros(n, n);
  for (let j = 0; j < n; j++) {
    let v = A.map((row) => row[j]);
    for (let i = 0; i < j; i++) {
      const qi = Q.map((row) => row[i]);
      const r = V.dot(qi, v);
      R[i][j] = r;
      v = v.map((vk, k) => vk - r * qi[k]);
    }
    const len = Math.sqrt(V.dot(v, v));
    R[j][j] = len;
    Q = Q.map((row, k) => {
      row[j] = len < 1e-14 ? 0 : v[k] / len;
      return row;
    });
  }
  return { Q, R };
}

/* --------------------------------------------------------------- norms */

export function norm1(A: Matrix): number {
  const n = A[0].length;
  let best = 0;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < A.length; i++) s += Math.abs(A[i][j]);
    best = Math.max(best, s);
  }
  return best;
}

export const normInf = (A: Matrix): number => S.max(A.map((row) => S.sum(row.map(Math.abs))));

export function condition(A: Matrix): number {
  const inv = inverse(A);
  if (!inv) return Infinity;
  return norm1(A) * norm1(inv);
}

/* ------------------------------------------------------------ eigen stuff */

export interface EigenResult {
  value: number;
  vector: Vec;
  iterations: number;
}

export interface PowerOptions {
  v0?: Vec;
  tol?: number;
  maxIter?: number;
}

/** Dominant eigenpair by power iteration. */
export function powerIteration(A: Matrix, opts: PowerOptions = {}): EigenResult {
  const n = A.length;
  let v = opts.v0 ? opts.v0.slice() : new Array<number>(n).fill(0).map((_, i) => (i === 0 ? 1 : 1 / n));
  let lambda = 0;
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? 500;
  let it = 0;
  for (; it < maxIter; it++) {
    const Av = mulVec(A, v);
    const nrm = V.len(Av);
    if (nrm < 1e-300) break;
    const nv = V.div(Av, nrm);
    lambda = V.dot(nv, mulVec(A, nv)); // Rayleigh quotient
    const diff = V.dist(nv, v);
    v = nv;
    if (diff < tol) break;
  }
  return { value: lambda, vector: v, iterations: it };
}

/** Inverse power iteration — finds the eigenvalue closest to sigma. */
export function inverseIteration(A: Matrix, sigma = 0, opts: PowerOptions = {}): EigenResult {
  const n = A.length;
  const M = A.map((row, i) => row.map((v, j) => v - (i === j ? sigma : 0)));
  let v = opts.v0 ? opts.v0.slice() : new Array<number>(n).fill(1);
  v = V.norm(v);
  let mu = sigma;
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? 500;
  let it = 0;
  for (; it < maxIter; it++) {
    const y = solve(M, v);
    if (!y) break;
    const nrm = V.len(y);
    if (nrm < 1e-300) break;
    const nv = V.div(y, nrm);
    mu = sigma + 1 / V.dot(nv, v); // Rayleigh shift
    const diff = V.dist(nv, v);
    v = nv;
    if (diff < tol) break;
  }
  return { value: mu, vector: v, iterations: it };
}

/** Trace of A^2 for the 2x2/3x3 forms (helps validate Jacobians). */
export const traceSq = (A: Matrix): number => trace(mul(A, A));

/* --------------------------------------------------------- small helpers */

/** 2x2 inverse, explicit (hot path in the photon integrator). */
export function inverse2(A: Matrix): Matrix | null {
  const d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (Math.abs(d) < 1e-300) return null;
  const inv = 1 / d;
  return [
    [A[1][1] * inv, -A[0][1] * inv],
    [-A[1][0] * inv, A[0][0] * inv]
  ];
}

/** 3x3 inverse, explicit. */
export function inverse3(A: Matrix): Matrix | null {
  const [a, b, c] = A[0];
  const [d, e, f] = A[1];
  const [g, h, i] = A[2];
  const A00 = e * i - f * h;
  const A01 = -(d * i - f * g);
  const A02 = d * h - e * g;
  const dt = a * A00 + b * A01 + c * A02;
  if (Math.abs(dt) < 1e-300) return null;
  const inv = 1 / dt;
  return [
    [A00 * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [A01 * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [A02 * inv, (b * g - a * h) * inv, (a * e - b * d) * inv]
  ];
}

/* ------------------------------------------------------------ rotations */

export function rot2(theta: number): Matrix {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    [c, -s],
    [s, c]
  ];
}

export function rotX(t: number): Matrix {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c]
  ];
}

export function rotY(t: number): Matrix {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c]
  ];
}

export function rotZ(t: number): Matrix {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
}

/* -------------------------------------------------- ODE system for RK4 ---- */

export type AccelFn = (t: number, x: Vec, v: Vec) => Vec;

/**
 * Expand a second-order system  x'' = a(x, x', t)  into the first-order
 * state form used by the RK integrators:  y = [x..., v...], y' = [v..., a...]
 */
export const stateDerivative =
  (accel: AccelFn) =>
    (t: number, y: Vec, dim: number): Vec => {
      const x = y.slice(0, dim);
      const v = y.slice(dim, 2 * dim);
      const acc = accel(t, x, v);
      return v.concat(acc);
    };
