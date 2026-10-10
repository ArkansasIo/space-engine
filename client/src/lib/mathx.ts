/**
 * mathx.ts — core numeric foundation.
 *
 * Vector algebra (generic N-dimensional), scalar helpers, statistics,
 * root finding, interpolation.
 */

/* ---------------------------------------------------------------- scalars */

export const EPS = 1e-12;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number =>
  Math.abs(b - a) < EPS ? 0 : (v - a) / (b - a);

export const remap = (v: number, a0: number, a1: number, b0: number, b1: number): number =>
  lerp(b0, b1, clamp01(invLerp(a0, a1, v)));

export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

export function smoothstep(t: number): number {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
}

export function smootherstep(t: number): number {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Gaussian falloff, f(0)=1, f(sigma)=e^-0.5 */
export const gauss = (x: number, sigma: number): number =>
  Math.exp(-(x * x) / (2 * sigma * sigma + EPS));

export const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Round to n significant digits, returned as a number. */
export function roundSig(v: number, n: number): number {
  if (v === 0 || !Number.isFinite(v)) return v;
  const p = Math.pow(10, n - 1 - Math.floor(Math.log10(Math.abs(v))));
  return Math.round(v * p) / p;
}

/* --------------------------------------------------- sci-notation formatter */

const SUP: Record<string, string> = {
  '-': '\u207B',
  '+': '\u207A',
  '0': '\u2070',
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079'
};

function supNum(s: string | number): string {
  return String(s)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('');
}

/** Human-readable number: 1234 -> 1.23e3 / 0.00042 -> 4.20e-4 */
export function fmt(v: number, digits = 2): string {
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
}

/** Pretty Unicode form, e.g. 3.00×10⁻⁵ */
export function fmtPretty(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return v > 0 ? '\u221E' : '-\u221E';
  const a = Math.abs(v);
  if (v !== 0 && (a >= 1e5 || a < 1e-3)) {
    const e = Math.floor(Math.log10(a));
    const mant = v / Math.pow(10, e);
    return `${mant.toFixed(digits)}\u00D710${supNum(e)}`;
  }
  return fmt(v, digits + 1);
}

/* ---------------------------------------------------------------- vectors */
/* Vectors are plain arrays and are treated as IMMUTABLE; mutate-in-place     */
/* variants are suffixed with 'i'.                                            */

export type Vec = number[];

export const V = {
  of: (...c: number[]): Vec => c.slice(),

  zero: (n: number): Vec => new Array(n).fill(0),

  clone: (a: Vec): Vec => a.slice(),

  add: (a: Vec, b: Vec): Vec => {
    const n = Math.min(a.length, b.length);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
    return out;
  },

  sub: (a: Vec, b: Vec): Vec => {
    const n = Math.min(a.length, b.length);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = a[i] - b[i];
    return out;
  },

  mul: (a: Vec, s: number): Vec => {
    const out = new Array<number>(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] * s;
    return out;
  },

  mulVec: (a: Vec, b: Vec): Vec => {
    const n = Math.min(a.length, b.length);
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = a[i] * b[i];
    return out;
  },

  div: (a: Vec, s: number): Vec => {
    const inv = 1 / s;
    const out = new Array<number>(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i] * inv;
    return out;
  },

  neg: (a: Vec): Vec => V.mul(a, -1),

  dot: (a: Vec, b: Vec): number => {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  },

  lenSq: (a: Vec): number => V.dot(a, a),

  len: (a: Vec): number => Math.sqrt(V.dot(a, a)),

  dist: (a: Vec, b: Vec): number => {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = a[i] - b[i];
      s += d * d;
    }
    return Math.sqrt(s);
  },

  distSq: (a: Vec, b: Vec): number => {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = a[i] - b[i];
      s += d * d;
    }
    return s;
  },

  /** Unit vector; returns zero vector when the input is degenerate. */
  norm: (a: Vec): Vec => {
    const L = V.len(a);
    return L < EPS ? V.zero(a.length) : V.mul(a, 1 / L);
  },

  /** Clamp a vector's magnitude to [lo, hi]. */
  clampMag: (a: Vec, lo: number, hi: number): Vec => {
    const L = V.len(a);
    if (L < EPS) return a.slice();
    const c = clamp(L, lo, hi);
    return V.mul(a, c / L);
  },

  addi: (A: Vec, b: Vec): Vec => {
    for (let i = 0; i < A.length && i < b.length; i++) A[i] += b[i];
    return A;
  },

  subi: (A: Vec, b: Vec): Vec => {
    for (let i = 0; i < A.length && i < b.length; i++) A[i] -= b[i];
    return A;
  },

  muli: (A: Vec, s: number): Vec => {
    for (let i = 0; i < A.length; i++) A[i] *= s;
    return A;
  },

  /** A += b * s */
  madd: (A: Vec, b: Vec, s: number): Vec => {
    for (let i = 0; i < A.length && i < b.length; i++) A[i] += b[i] * s;
    return A;
  },

  lerp: (a: Vec, b: Vec, t: number): Vec => V.add(a, V.mul(V.sub(b, a), t)),

  /** Linear combination: sum(coeffs[i] * vecs[i]) */
  linComb: (coeffs: number[], vecs: Vec[]): Vec => {
    const n = vecs[0].length;
    const out = new Array<number>(n).fill(0);
    for (let k = 0; k < vecs.length; k++) {
      const c = coeffs[k];
      const v = vecs[k];
      for (let i = 0; i < n; i++) out[i] += c * v[i];
    }
    return out;
  },

  map: (a: Vec, f: (v: number, i: number) => number): Vec => a.map(f),

  angleOf: (v: Vec): number => Math.atan2(v[1], v[0]),

  fromAngle: (theta: number, r = 1): Vec => [Math.cos(theta) * r, Math.sin(theta) * r],

  rotate: (v: Vec, theta: number): Vec => {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  },

  /** 2-D cross product (z component of a x b). */
  cross2: (a: Vec, b: Vec): number => a[0] * b[1] - a[1] * b[0],

  cross3: (a: Vec, b: Vec): Vec => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ],

  maxAbs: (a: Vec): number => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0),

  /** Are any components NaN/Inf? */
  isBad: (a: Vec): boolean => a.some((v) => !Number.isFinite(v))
};

/* -------------------------------------------------------------- statistics */

export const S = {
  sum: (arr: number[]): number => arr.reduce((s, v) => s + v, 0),

  mean: (arr: number[]): number => (arr.length ? S.sum(arr) / arr.length : 0),

  min: (arr: number[]): number => arr.reduce((m, v) => (v < m ? v : m), Infinity),

  max: (arr: number[]): number => arr.reduce((m, v) => (v > m ? v : m), -Infinity),

  variance: (arr: number[]): number => {
    if (arr.length < 2) return 0;
    const mu = S.mean(arr);
    return S.sum(arr.map((v) => (v - mu) * (v - mu))) / (arr.length - 1);
  },

  stddev: (arr: number[]): number => Math.sqrt(S.variance(arr)),

  range: (arr: number[]): { lo: number; hi: number } => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of arr) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return { lo, hi };
  }
};

/** Running mean / EMA accumulator. */
export class EMA {
  private primed = false;
  private _value = 0;

  constructor(public alpha = 0.1) { }

  push(x: number): number {
    if (!this.primed) {
      this._value = x;
      this.primed = true;
    } else {
      this._value += this.alpha * (x - this._value);
    }
    return this._value;
  }

  reset(): void {
    this.primed = false;
    this._value = 0;
  }

  get value(): number {
    return this._value;
  }
}

/* ---------------------------------------------------------- root finding */

export const R = {
  /**
   * Bisection on f over [a,b]; requires a sign change.
   * @returns approximate root, or NaN if not bracketed.
   */
  bisect: (f: (x: number) => number, a: number, b: number, tol = 1e-10, maxIter = 200): number => {
    let fa = f(a);
    let fb = f(b);
    if (fa === 0) return a;
    if (fb === 0) return b;
    if (fa * fb > 0) return NaN;
    let mid = a;
    for (let i = 0; i < maxIter; i++) {
      mid = 0.5 * (a + b);
      const fm = f(mid);
      if (Math.abs(fm) < tol || (b - a) * 0.5 < tol) return mid;
      if (fa * fm < 0) {
        b = mid;
        fb = fm;
      } else {
        a = mid;
        fa = fm;
      }
    }
    return mid;
  },

  /** Secant method. */
  secant: (
    f: (x: number) => number,
    x0: number,
    x1: number,
    tol = 1e-10,
    maxIter = 100
  ): number => {
    let f0 = f(x0);
    let f1 = f(x1);
    for (let i = 0; i < maxIter; i++) {
      const d = f1 - f0;
      if (Math.abs(d) < EPS) return x1;
      const x2 = x1 - (f1 * (x1 - x0)) / d;
      if (Math.abs(x2 - x1) < tol) return x2;
      x0 = x1;
      f0 = f1;
      x1 = x2;
      f1 = f(x2);
    }
    return x1;
  },

  /** Newton–Raphson; df optional (falls back to numeric derivative). */
  newton: (
    f: (x: number) => number,
    df: ((x: number) => number) | null,
    x0: number,
    tol = 1e-10,
    maxIter = 100
  ): number => {
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const fx = f(x);
      const d = df ? df(x) : (f(x + 1e-7) - f(x - 1e-7)) / 2e-7;
      if (Math.abs(d) < EPS) break;
      const nx = x - fx / d;
      if (Math.abs(nx - x) < tol) return nx;
      x = nx;
    }
    return x;
  }
};

/* -------------------------------------------------------- interpolation */

export type Point2 = [number, number];

export const I = {
  /** Lagrange polynomial interpolation through points [[x,y],...]. */
  lagrange: (pts: Point2[], x: number): number => {
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
  },

  /** Piecewise-linear lookup with clamped ends. */
  linear: (pts: Point2[], x: number): number => {
    if (!pts.length) return NaN;
    if (x <= pts[0][0]) return pts[0][1];
    const n = pts.length;
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    for (let i = 1; i < n; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        return lerp(y0, y1, invLerp(x0, x1, x));
      }
    }
    return pts[n - 1][1];
  }
};
