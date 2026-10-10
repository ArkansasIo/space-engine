/* =============================================================================
 * mathx.js — core numeric foundation
 * -----------------------------------------------------------------------------
 * Vector algebra (generic N-dimensional), scalar helpers, statistics,
 * root finding, interpolation. No dependencies; everything hangs off MathX.
 * ===========================================================================*/
(function (global) {
  'use strict';

  const M = {};

  /* ---------------------------------------------------------------- scalars */

  M.EPS = 1e-12;

  M.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  M.clamp01 = (v) => M.clamp(v, 0, 1);

  M.lerp = (a, b, t) => a + (b - a) * t;

  M.invLerp = (a, b, v) => (Math.abs(b - a) < M.EPS ? 0 : (v - a) / (b - a));

  M.remap = (v, a0, a1, b0, b1) => M.lerp(b0, b1, M.clamp01(M.invLerp(a0, a1, v)));

  M.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

  M.smoothstep = (t) => {
    t = M.clamp01(t);
    return t * t * (3 - 2 * t);
  };

  M.smootherstep = (t) => {
    t = M.clamp01(t);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  /** Gaussian falloff, f(0)=1, f(sigma)=e^-0.5 */
  M.gauss = (x, sigma) => Math.exp(-(x * x) / (2 * sigma * sigma + M.EPS));

  M.isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

  /** Round to n significant digits, returned as a number. */
  M.roundSig = (v, n) => {
    if (v === 0 || !Number.isFinite(v)) return v;
    const p = Math.pow(10, n - 1 - Math.floor(Math.log10(Math.abs(v))));
    return Math.round(v * p) / p;
  };

  /* --------------------------------------------------- sci-notation formatter */

  const SUP = { '-': '\u207B', '+': '\u207A', '0': '\u2070', '1': '\u00B9', '2': '\u00B2',
                '3': '\u00B3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
                '8': '\u2078', '9': '\u2079' };

  function supNum(s) {
    return String(s).split('').map((c) => SUP[c] || c).join('');
  }

  /**
   * Human-readable number: 1234 -> 1.23e3 / 0.00042 -> 4.20e-4
   * @param {number} v
   * @param {number} [digits=2]
   */
  M.fmt = (v, digits = 2) => {
    if (!Number.isFinite(v)) return v > 0 ? '\u221E' : Number.isNaN(v) ? 'NaN' : '-\u221E';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) {
      const e = Math.floor(Math.log10(a));
      const mant = v / Math.pow(10, e);
      return `${mant.toFixed(digits)}e${e}`;
    }
    if (a >= 100) return v.toFixed(Math.max(0, digits - 1));
    return v.toFixed(digits);
  };

  /** Pretty Unicode form, e.g. 3.00×10⁻⁵ */
  M.fmtPretty = (v, digits = 2) => {
    if (!Number.isFinite(v)) return v > 0 ? '\u221E' : '-\u221E';
    const a = Math.abs(v);
    if (v !== 0 && (a >= 1e5 || a < 1e-3)) {
      const e = Math.floor(Math.log10(a));
      const mant = v / Math.pow(10, e);
      return `${mant.toFixed(digits)}\u00D710${supNum(e)}`;
    }
    return M.fmt(v, digits + 1);
  };

  /* ---------------------------------------------------------------- vectors */
  /* Vectors are plain arrays. Vectors are treated as IMMUTABLE here;          */
  /* mutate-in-place variants are suffixed with 'i'.                           */

  const V = {};

  V.of = (...c) => c.slice();

  V.zero = (n) => new Array(n).fill(0);

  V.clone = (a) => a.slice();

  V.add = (a, b) => {
    const n = Math.min(a.length, b.length), out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
    return out;
  };

  V.sub = (a, b) => {
    const n = Math.min(a.length, b.length), out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = a[i] - b[i];
    return out;
  };

  V.mul = (a, s) => {
    const out = new Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] * s;
    return out;
  };

  V.mulVec = (a, b) => {
    const n = Math.min(a.length, b.length), out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = a[i] * b[i];
    return out;
  };

  V.div = (a, s) => {
    const inv = 1 / s, out = new Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] * inv;
    return out;
  };

  V.neg = (a) => V.mul(a, -1);

  V.dot = (a, b) => {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  };

  V.lenSq = (a) => V.dot(a, a);

  V.len = (a) => Math.sqrt(V.dot(a, a));

  V.dist = (a, b) => {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = a[i] - b[i];
      s += d * d;
    }
    return Math.sqrt(s);
  };

  V.distSq = (a, b) => {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = a[i] - b[i];
      s += d * d;
    }
    return s;
  };

  /** Unit vector; returns zero vector when the input is degenerate. */
  V.norm = (a) => {
    const L = V.len(a);
    return L < M.EPS ? V.zero(a.length) : V.mul(a, 1 / L);
  };

  /** Clamp a vector's magnitude to [lo, hi]. */
  V.clampMag = (a, lo, hi) => {
    const L = V.len(a);
    if (L < M.EPS) return a.slice();
    const c = M.clamp(L, lo, hi);
    return V.mul(a, c / L);
  };

  V.addi = (A, b) => {
    for (let i = 0; i < A.length && i < b.length; i++) A[i] += b[i];
    return A;
  };
  V.subi = (A, b) => {
    for (let i = 0; i < A.length && i < b.length; i++) A[i] -= b[i];
    return A;
  };
  V.muli = (A, s) => {
    for (let i = 0; i < A.length; i++) A[i] *= s;
    return A;
  };
  V.madd = (A, b, s) => {                 // A += b * s
    for (let i = 0; i < A.length && i < b.length; i++) A[i] += b[i] * s;
    return A;
  };

  V.lerp = (a, b, t) => V.add(a, V.mul(V.sub(b, a), t));

  /** Linear combination: sum(coeffs[i] * vecs[i]) */
  V.linComb = (coeffs, vecs) => {
    const n = vecs[0].length, out = new Array(n).fill(0);
    for (let k = 0; k < vecs.length; k++) {
      const c = coeffs[k], v = vecs[k];
      for (let i = 0; i < n; i++) out[i] += c * v[i];
    }
    return out;
  };

  V.map = (a, f) => a.map(f);

  V.angleOf = (v) => Math.atan2(v[1], v[0]);

  V.fromAngle = (theta, r = 1) => [Math.cos(theta) * r, Math.sin(theta) * r];

  V.rotate = (v, theta) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  };

  /** 2-D cross product (z component of a x b). */
  V.cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

  V.cross3 = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  /** Deterministic max-component-wise comparison helper. */
  V.maxAbs = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

  /** Are any components NaN/Inf? */
  V.isBad = (a) => a.some((v) => !Number.isFinite(v));

  M.V = V;

  /* -------------------------------------------------------------- statistics */

  const S = {};

  S.sum = (arr) => arr.reduce((s, v) => s + v, 0);
  S.mean = (arr) => (arr.length ? S.sum(arr) / arr.length : 0);
  S.min = (arr) => arr.reduce((m, v) => (v < m ? v : m), Infinity);
  S.max = (arr) => arr.reduce((m, v) => (v > m ? v : m), -Infinity);

  S.variance = (arr) => {
    if (arr.length < 2) return 0;
    const mu = S.mean(arr);
    return S.sum(arr.map((v) => (v - mu) * (v - mu))) / (arr.length - 1);
  };

  S.stddev = (arr) => Math.sqrt(S.variance(arr));

  S.range = (arr) => {
    let lo = Infinity, hi = -Infinity;
    for (const v of arr) { if (v < lo) lo = v; if (v > hi) hi = v; }
    return { lo, hi };
  };

  /** Running mean/EMA accumulator. */
  S.EMA = function (alpha = 0.1) {
    this.alpha = alpha;
    this.value = 0;
    this.primed = false;
  };
  S.EMA.prototype.push = function (x) {
    if (!this.primed) { this.value = x; this.primed = true; }
    else this.value += this.alpha * (x - this.value);
    return this.value;
  };
  S.EMA.prototype.reset = function () { this.primed = false; this.value = 0; };

  M.S = S;

  /* ---------------------------------------------------------- root finding */

  const R = {};

  /**
   * Bisection on f over [a,b]; requires a sign change.
   * @returns {number} approximate root, or NaN if not bracketed.
   */
  R.bisect = (f, a, b, tol = 1e-10, maxIter = 200) => {
    let fa = f(a), fb = f(b);
    if (fa === 0) return a;
    if (fb === 0) return b;
    if (fa * fb > 0) return NaN;
    let mid = a;
    for (let i = 0; i < maxIter; i++) {
      mid = 0.5 * (a + b);
      const fm = f(mid);
      if (Math.abs(fm) < tol || (b - a) * 0.5 < tol) return mid;
      if (fa * fm < 0) { b = mid; fb = fm; }
      else { a = mid; fa = fm; }
    }
    return mid;
  };

  /** Secant method. */
  R.secant = (f, x0, x1, tol = 1e-10, maxIter = 100) => {
    let f0 = f(x0), f1 = f(x1);
    for (let i = 0; i < maxIter; i++) {
      const d = f1 - f0;
      if (Math.abs(d) < M.EPS) return x1;
      const x2 = x1 - f1 * (x1 - x0) / d;
      if (Math.abs(x2 - x1) < tol) return x2;
      x0 = x1; f0 = f1; x1 = x2; f1 = f(x2);
    }
    return x1;
  };

  /** Newton–Raphson; df optional (falls back to numeric derivative). */
  R.newton = (f, df, x0, tol = 1e-10, maxIter = 100) => {
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const fx = f(x);
      const d = df ? df(x) : (f(x + 1e-7) - f(x - 1e-7)) / 2e-7;
      if (Math.abs(d) < M.EPS) break;
      const nx = x - fx / d;
      if (Math.abs(nx - x) < tol) return nx;
      x = nx;
    }
    return x;
  };

  M.R = R;

  /* -------------------------------------------------------- interpolation */

  const I = {};

  /** Lagrange polynomial interpolation through points [[x,y],...]. */
  I.lagrange = (pts, x) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      let t = pts[i][1];
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        t *= (x - pts[j][0]) / (pts[i][0] - pts[j][0]);
      }
      s += t;
    }
    return s;
  };

  /** Piecewise-linear lookup with clamped ends. */
  I.linear = (pts, x) => {
    if (!pts.length) return NaN;
    if (x <= pts[0][0]) return pts[0][1];
    const n = pts.length;
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    for (let i = 1; i < n; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return M.lerp(y0, y1, M.invLerp(x0, x1, x));
      }
    }
    return pts[n - 1][1];
  };

  M.I = I;

  global.MathX = M;
})(window);
