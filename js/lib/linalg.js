/* =============================================================================
 * linalg.js — linear algebra
 * -----------------------------------------------------------------------------
 * Matrices are arrays of row arrays. Small sizes only; clarity over speed.
 * Includes: basic ops, transpose, determinant (LU), inverse, solve,
 * LU/QR/Cholesky, power iteration for eigenpairs, 2x2/3x3 helpers
 * (needed for the relativistic photon integrator) and rotation matrices.
 * ===========================================================================*/
(function (global) {
  'use strict';

  const X = MathX;
  const L = {};

  /* --------------------------------------------------------------- creation */

  L.zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));

  L.identity = (n) => Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  L.fromDiag = (d) => {
    const n = d.length, m = L.zeros(n, n);
    for (let i = 0; i < n; i++) m[i][i] = d[i];
    return m;
  };

  L.clone = (A) => A.map((row) => row.slice());

  L.dim = (A) => ({ rows: A.length, cols: A[0] ? A[0].length : 0 });

  /* ------------------------------------------------------------ elementwise */

  L.add = (A, B) => A.map((row, i) => row.map((v, j) => v + B[i][j]));
  L.sub = (A, B) => A.map((row, i) => row.map((v, j) => v - B[i][j]));
  L.scale = (A, s) => A.map((row) => row.map((v) => v * s));
  L.hadamard = (A, B) => A.map((row, i) => row.map((v, j) => v * B[i][j]));

  L.transpose = (A) => A[0].map((_, j) => A.map((row) => row[j]));

  /** Matrix product A (m x n) * B (n x p). */
  L.mul = (A, B) => {
    const m = A.length, n = B.length, p = B[0].length;
    const out = L.zeros(m, p);
    for (let i = 0; i < m; i++) {
      for (let k = 0; k < n; k++) {
        const a = A[i][k];
        if (a === 0) continue;
        const brow = B[k];
        for (let j = 0; j < p; j++) out[i][j] += a * brow[j];
      }
    }
    return out;
  };

  /** Matrix * column vector. */
  L.mulVec = (A, v) => A.map((row) => {
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j] * v[j];
    return s;
  });

  /** Row vector * matrix. */
  L.vecMul = (v, A) => {
    const p = A[0].length, out = new Array(p).fill(0);
    for (let i = 0; i < A.length; i++)
      for (let j = 0; j < p; j++) out[j] += v[i] * A[i][j];
    return out;
  };

  L.outer = (a, b) => a.map((ai) => b.map((bj) => ai * bj));

  L.trace = (A) => A.reduce((s, row, i) => s + row[i], 0);

  L.normFro = (A) => Math.sqrt(A.reduce((s, row) =>
    s + row.reduce((t, v) => t + v * v, 0), 0));

  L.equals = (A, B, tol = 1e-9) =>
    A.length === B.length && A.every((row, i) =>
      row.length === B[i].length && row.every((v, j) => Math.abs(v - B[i][j]) < tol));

  /* ------------------------------------------------------------- LU / solve */

  /**
   * LU decomposition with partial pivoting.
   * @returns {{LU:number[][], piv:number[], sign:number, singular:boolean}}
   */
  L.luDecompose = (A) => {
    const n = A.length;
    const M = L.clone(A);
    const piv = Array.from({ length: n }, (_, i) => i);
    let sign = 1, singular = false;

    for (let k = 0; k < n; k++) {
      let p = k, max = Math.abs(M[k][k]);
      for (let i = k + 1; i < n; i++) {
        const v = Math.abs(M[i][k]);
        if (v > max) { max = v; p = i; }
      }
      if (max < 1e-14) { singular = true; continue; }
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
  };

  L.det = (A) => {
    const n = A.length;
    if (n === 0) return 1;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (n === 3) {
      const [a, b, c] = A[0], [d, e, f] = A[1], [g, h, i] = A[2];
      return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    }
    const { LU, sign, singular } = L.luDecompose(A);
    if (singular) return 0;
    let d = sign;
    for (let i = 0; i < n; i++) d *= LU[i][i];
    return d;
  };

  /** Solve A x = b using LU with partial pivoting. */
  L.solve = (A, b) => {
    const n = A.length;
    const { LU, piv, singular } = L.luDecompose(A);
    if (singular) return null;

    // apply permutation
    const y = new Array(n);
    for (let i = 0; i < n; i++) y[i] = b[piv[i]];

    // forward substitution (unit lower triangular)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < i; j++) y[i] -= LU[i][j] * y[j];

    // back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let j = i + 1; j < n; j++) s -= LU[i][j] * x[j];
      x[i] = s / LU[i][i];
    }
    return x;
  };

  /** Matrix inverse via Gauss–Jordan with partial pivoting. */
  L.inverse = (A) => {
    const n = A.length;
    const M = A.map((row, i) =>
      row.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));

    for (let k = 0; k < n; k++) {
      let p = k, max = Math.abs(M[k][k]);
      for (let i = k + 1; i < n; i++) {
        const v = Math.abs(M[i][k]);
        if (v > max) { max = v; p = i; }
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
  };

  L.rank = (A) => {
    const M = L.clone(A), rows = M.length, cols = M[0].length;
    let rank = 0;
    for (let c = 0, r = 0; c < cols && r < rows; c++) {
      let p = r, max = Math.abs(M[r][c]);
      for (let i = r + 1; i < rows; i++) {
        if (Math.abs(M[i][c]) > max) { max = Math.abs(M[i][c]); p = i; }
      }
      if (max < 1e-12) continue;
      [M[p], M[r]] = [M[r], M[p]];
      for (let i = r + 1; i < rows; i++) {
        const f = M[i][c] / M[r][c];
        for (let j = c; j < cols; j++) M[i][j] -= f * M[r][j];
      }
      r++; rank++;
    }
    return rank;
  };

  /* ------------------------------------------------------- decompositions */

  /** Cholesky A = L Lᵀ for symmetric positive-definite A. */
  L.cholesky = (A) => {
    const n = A.length, Lm = L.zeros(n, n);
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
  };

  /** Gram–Schmidt QR decomposition. */
  L.qr = (A) => {
    const m = A.length, n = A[0].length;
    const Q = L.zeros(m, n), R = L.zeros(n, n);
    for (let j = 0; j < n; j++) {
      let v = A.map((row) => row[j]);
      for (let i = 0; i < j; i++) {
        const qi = Q.map((row) => row[i]);
        const r = X.V.dot(qi, v);
        R[i][j] = r;
        v = v.map((vk, k) => vk - r * qi[k]);
      }
      const len = Math.sqrt(X.V.dot(v, v));
      R[j][j] = len;
      Q = Q.map((row, k) => {
        row[j] = len < 1e-14 ? 0 : v[k] / len;
        return row;
      });
    }
    return { Q, R };
  };

  /* --------------------------------------------------------------- norms */

  L.norm1 = (A) => {
    const n = A[0].length;
    let best = 0;
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < A.length; i++) s += Math.abs(A[i][j]);
      best = Math.max(best, s);
    }
    return best;
  };

  L.normInf = (A) => X.S.max(A.map((row) => X.S.sum(row.map(Math.abs))));

  L.condition = (A) => {
    const inv = L.inverse(A);
    if (!inv) return Infinity;
    return L.norm1(A) * L.norm1(inv);
  };

  /* ------------------------------------------------------------ eigen stuff */

  /**
   * Dominant eigenpair by power iteration.
   * @returns {{value:number, vector:number[], iterations:number}}
   */
  L.powerIteration = (A, opts = {}) => {
    const n = A.length;
    let v = opts.v0 ? opts.v0.slice() : new Array(n).fill(0).map((_, i) => i === 0 ? 1 : 1 / n);
    let lambda = 0;
    const tol = opts.tol ?? 1e-10, maxIter = opts.maxIter ?? 500;
    let it = 0;
    for (; it < maxIter; it++) {
      const Av = L.mulVec(A, v);
      const nrm = X.V.len(Av);
      if (nrm < 1e-300) break;
      const nv = X.V.div(Av, nrm);
      lambda = X.V.dot(nv, L.mulVec(A, nv));   // Rayleigh quotient
      const diff = X.V.dist(nv, v);
      v = nv;
      if (diff < tol) break;
    }
    return { value: lambda, vector: v, iterations: it };
  };

  /** Inverse power iteration — finds the eigenvalue closest to sigma. */
  L.inverseIteration = (A, sigma = 0, opts = {}) => {
    const n = A.length;
    const M = A.map((row, i) => row.map((v, j) => v - (i === j ? sigma : 0)));
    let v = opts.v0 ? opts.v0.slice() : new Array(n).fill(1);
    v = X.V.norm(v);
    let mu = sigma;
    const tol = opts.tol ?? 1e-10, maxIter = opts.maxIter ?? 500;
    let it = 0;
    for (; it < maxIter; it++) {
      const y = L.solve(M, v);
      if (!y) break;
      const nrm = X.V.len(y);
      if (nrm < 1e-300) break;
      const nv = X.V.div(y, nrm);
      mu = sigma + 1 / X.V.dot(nv, v);     // Rayleigh shift
      const diff = X.V.dist(nv, v);
      v = nv;
      if (diff < tol) break;
    }
    return { value: mu, vector: v, iterations: it };
  };

  /** Trace of A^2 for the 2x2/3x3 forms (helps validate Jacobians). */
  L.traceSq = (A) => L.trace(L.mul(A, A));

  /* --------------------------------------------------------- small helpers */

  /** 2x2 inverse, explicit (hot path in the photon integrator). */
  L.inverse2 = (A) => {
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    if (Math.abs(det) < 1e-300) return null;
    const inv = 1 / det;
    return [
      [A[1][1] * inv, -A[0][1] * inv],
      [-A[1][0] * inv, A[0][0] * inv]
    ];
  };

  /** 3x3 inverse, explicit. */
  L.inverse3 = (A) => {
    const [a, b, c] = A[0], [d, e, f] = A[1], [g, h, i] = A[2];
    const A00 = e * i - f * h, A01 = -(d * i - f * g), A02 = d * h - e * g;
    const det = a * A00 + b * A01 + c * A02;
    if (Math.abs(det) < 1e-300) return null;
    const inv = 1 / det;
    return [
      [A00 * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
      [A01 * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
      [A02 * inv, (b * g - a * h) * inv, (a * e - b * d) * inv]
    ];
  };

  /* ------------------------------------------------------------ rotations */

  L.rot2 = (theta) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [[c, -s], [s, c]];
  };

  L.rotX = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [[1, 0, 0], [0, c, -s], [0, s, c]];
  };
  L.rotY = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  };
  L.rotZ = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  };

  /* -------------------------------------------------- ODE system for RK4 ---- */
  /**
   * Expand a second-order system  x'' = a(x, x', t)  into the first-order
   * state form used by the RK integrators:  y = [x..., v...], y' = [v..., a...]
   */
  L.stateDerivative = (accel) => (t, y, dim) => {
    const x = y.slice(0, dim);
    const v = y.slice(dim, 2 * dim);
    const acc = accel(t, x, v);
    return v.concat(acc);
  };

  global.LinAlg = L;
})(window);
