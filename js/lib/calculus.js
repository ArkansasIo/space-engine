backend
/* =============================================================================
 * calculus.js — differential & integral calculus toolkit
 * -----------------------------------------------------------------------------
 * Numerical derivatives (forward / backward / central / Richardson),
 * second derivatives, gradients & Jacobians, definite integrals
 * (trapezoid / Simpson / adaptive Simpson / Gauss–Legendre / Romberg),
 * arc length, ODE derivative helpers, partial derivatives and the
 * classic gravitational-potential functions used by the simulator.
 * ===========================================================================*/
(function (global) {
  'use strict';

  const X = MathX;
  const C = {};

  /* ============================================================ DERIVATIVES */

  /** Forward difference: (f(x+h) - f(x)) / h */
  C.forwardDiff = (f, x, h = 1e-6) => (f(x + h) - f(x)) / h;

  /** Backward difference: (f(x) - f(x-h)) / h */
  C.backwardDiff = (f, x, h = 1e-6) => (f(x) - f(x - h)) / h;

  /** Central difference: (f(x+h) - f(x-h)) / 2h — O(h^2) */
  C.centralDiff = (f, x, h = 1e-6) => (f(x + h) - f(x - h)) / (2 * h);

  /** Five-point stencil: O(h^4) */
  C.fivePointDiff = (f, x, h = 1e-5) =>
    (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);

  /**
   * Richardson extrapolation over central differences — dramatically more
   * accurate for smooth f. Order doubles each level.
   */
  C.richardsonDiff = (f, x, h = 1e-3, levels = 5) => {
    const R = [];
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
  };

  /** Second derivative via central second difference, O(h^2). */
  C.secondDiff = (f, x, h = 1e-4) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);

  /** Third derivative, O(h^2). */
  C.thirdDiff = (f, x, h = 1e-4) =>
    (f(x + 2 * h) - 2 * f(x + h) + 2 * f(x - h) - f(x - 2 * h)) / (2 * h * h * h);

  /**
   * Numeric gradient of a scalar field f: R^n -> R.
   * @returns {number[]} gradient vector
   */
  C.gradient = (f, x, h = 1e-6) => {
    const n = x.length, g = new Array(n);
    for (let i = 0; i < n; i++) {
      const xp = x.slice(), xm = x.slice();
      xp[i] += h; xm[i] -= h;
      g[i] = (f(xp) - f(xm)) / (2 * h);
    }
    return g;
  };

  /** Jacobian matrix of a vector field F: R^n -> R^m (rows = outputs). */
  C.jacobian = (F, x, h = 1e-6) => {
    const f0 = F(x);
    const m = f0.length, n = x.length;
    const J = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      const xp = x.slice(), xm = x.slice();
      xp[j] += h; xm[j] -= h;
      const fp = F(xp), fm = F(xm);
      for (let i = 0; i < m; i++) J[i][j] = (fp[i] - fm[i]) / (2 * h);
    }
    return J;
  };

  /** Divergence of F: R^n -> R^n. */
  C.divergence = (F, x, h = 1e-6) => {
    let d = 0;
    for (let i = 0; i < x.length; i++) {
      const xp = x.slice(), xm = x.slice();
      xp[i] += h; xm[i] -= h;
      d += (F(xp)[i] - F(xm)[i]) / (2 * h);
    }
    return d;
  };

  /** Curl magnitude of a 3-D field (returns the full curl vector). */
  C.curl3 = (F, x, h = 1e-6) => {
    const px = (i, s) => { const a = x.slice(); a[i] += s * h; return a; };
    const dF = (o, i) => (F(px(i, 1))[o] - F(px(i, -1))[o]) / (2 * h);
    return [
      dF(2, 1) - dF(1, 2),
      dF(0, 2) - dF(2, 0),
      dF(1, 0) - dF(0, 1)
    ];
  };

  /** Partial derivative of a multivariate f w.r.t. index i. */
  C.partial = (f, x, i, h = 1e-6) => {
    const xp = x.slice(), xm = x.slice();
    xp[i] += h; xm[i] -= h;
    return (f(xp) - f(xm)) / (2 * h);
  };

  /** Tangent line at x0, returned as a function of x. */
  C.tangentLine = (f, x0, h = 1e-6) => {
    const slope = C.centralDiff(f, x0, h);
    const y0 = f(x0);
    return (x) => y0 + slope * (x - x0);
  };

  /** Numeric derivative wrapped as a function (useful for repeated evals). */
  C.derivative = (f, opts = {}) => {
    const h = opts.h ?? 1e-6;
    const method = opts.method || 'central';
    const table = {
      forward: C.forwardDiff,
      backward: C.backwardDiff,
      central: C.centralDiff,
      fivePoint: C.fivePointDiff,
      richardson: (fn, x) => C.richardsonDiff(fn, x, opts.h ?? 1e-3, opts.levels ?? 5)
    };
    const m = table[method] || C.centralDiff;
    return (x) => m(f, x, h);
  };

  /* ========================================================== INTEGRALS */

  /** Composite trapezoid rule on [a,b]. */
  C.trapz = (f, a, b, n = 512) => {
    if (n < 1) n = 1;
    const h = (b - a) / n;
    let s = 0.5 * (f(a) + f(b));
    for (let i = 1; i < n; i++) s += f(a + i * h);
    return s * h;
  };

  /** Trapezoid on a sampled data array (x may be non-uniform or omitted). */
  C.trapzData = (ys, xs = null) => {
    let s = 0;
    for (let i = 1; i < ys.length; i++) {
      const dx = xs ? xs[i] - xs[i - 1] : 1;
      s += 0.5 * (ys[i] + ys[i - 1]) * dx;
    }
    return s;
  };

  /** Simpson's rule; falls back to trapezoid for odd intervals. */
  C.simpson = (f, a, b, n = 512) => {
    if (n % 2 !== 0) n += 1;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  };

  /** Simpson 3/8 rule (n multiple of 3). */
  C.simpson38 = (f, a, b, n = 513) => {
    if (n % 3 !== 0) n += 3 - (n % 3);
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) {
      const w = i % 3 === 0 ? 2 : 3;
      s += w * f(a + i * h);
    }
    return (3 * s * h) / 8;
  };

  /** Adaptive Simpson with relative tolerance. */
  C.adaptiveSimpson = (f, a, b, tol = 1e-8, maxDepth = 24) => {
    const S = (a2, b2) => {
      const m = 0.5 * (a2 + b2);
      return ((b2 - a2) / 6) * (f(a2) + 4 * f(m) + f(b2));
    };
    const rec = (a2, b2, whole, depth) => {
      const m = 0.5 * (a2 + b2);
      const left = S(a2, m), right = S(m, b2);
      const delta = left + right - whole;
      if (depth <= 0 || Math.abs(delta) <= 15 * tol) {
        return left + right + delta / 15;
      }
      return rec(a2, m, left, depth - 1) + rec(m, b2, right, depth - 1);
    };
    return rec(a, b, S(a, b), maxDepth);
  };

  /* --- Gauss–Legendre: nodes/weights generated numerically (Newton on P_n) */
  const _glCache = new Map();
  function gaussLegendre(n) {
    if (_glCache.has(n)) return _glCache.get(n);
    const xs = new Array(n), ws = new Array(n);
    for (let i = 0; i < n; i++) {
      // initial guess: Chebyshev-like
      let x = Math.cos(Math.PI * (i + 0.75) / (n + 0.5));
      let dp = 0;
      for (let it = 0; it < 100; it++) {
        // Legendre P_n via recurrence
        let p0 = 1, p1 = x;
        for (let k = 2; k <= n; k++) {
          const pk = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
          p0 = p1; p1 = pk;
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
  C.gaussLegendre = (f, a, b, n = 16) => {
    const { xs, ws } = gaussLegendre(n);
    const c = 0.5 * (b - a), mid = 0.5 * (a + b);
    let s = 0;
    for (let i = 0; i < n; i++) s += ws[i] * f(mid + c * xs[i]);
    return s * c;
  };

  /** Romberg integration using successive trapezoid refinements. */
  C.romberg = (f, a, b, levels = 8) => {
    const R = [];
    for (let i = 0; i < levels; i++) {
      const n = Math.pow(2, i);
      R.push([C.trapz(f, a, b, n)]);
    }
    for (let k = 1; k < levels; k++) {
      for (let i = levels - 1; i >= k; i--) {
        const p = Math.pow(4, k);
        R[i][k] = (p * R[i][k - 1] - R[i - 1][k - 1]) / (p - 1);
      }
    }
    return R[levels - 1][levels - 1];
  };

  /** Improper integral over [a, inf) via substitution t in [0,1]. */
  C.integrateToInfinity = (f, a, n = 512) =>
    C.trapz((t) => {
      const x = a + t / (1 - t);
      return f(x) / ((1 - t) * (1 - t));
    }, 0, 1 - 1e-9, n);

  /** Integral of sampled y over sampled x (cubic-ish via Simpson/trapz mix). */
  C.cumulativeIntegral = (ys, xs) => {
    const n = ys.length, out = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const dx = xs[i] - xs[i - 1];
      out[i] = out[i - 1] + 0.5 * (ys[i] + ys[i - 1]) * dx;
    }
    return out;
  };

  /* ======================================================= GEOMETRY / ARC */

  /** Arc length of y=f(x) on [a,b]. */
  C.arcLength = (f, a, b, n = 512) => {
    const df = C.derivative(f, { method: 'central' });
    return C.simpson((x) => Math.sqrt(1 + df(x) * df(x)), a, b, n);
  };

  /** Arc length of a parametric curve r(t) = [x(t), y(t)] on [t0,t1]. */
  C.arcLengthParametric = (r, t0, t1, n = 512) => {
    const h = (t1 - t0) / n;
    const speed = (t) => {
      const p1 = r(t + h * 0.5), p0 = r(t - h * 0.5);
      return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / h;
    };
    return C.simpson(speed, t0, t1, n);
  };

  /** Area between two curves on [a,b]; positive where f > g. */
  C.areaBetween = (f, g, a, b, n = 512) =>
    C.simpson((x) => f(x) - g(x), a, b, n);

  /** Signed area enclosed by a closed polyline (shoelace formula). */
  C.shoelace = (pts) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return s / 2;
  };

  /** Volume of revolution about the x-axis, disk method. */
  C.volumeOfRevolution = (f, a, b, n = 512) =>
    C.simpson((x) => Math.PI * f(x) * f(x), a, b, n);

  /** Surface area of revolution about the x-axis. */
  C.surfaceOfRevolution = (f, a, b, n = 512) => {
    const df = C.derivative(f);
    return C.simpson((x) => 2 * Math.PI * f(x) * Math.sqrt(1 + df(x) ** 2), a, b, n);
  };

  /* ================================================= SERIES / LIMITS */

  /** Taylor coefficients of f about x0 up to order n. */
  C.taylorCoefficients = (f, x0, n = 5) => {
    const facts = [1];
    for (let i = 1; i <= n; i++) facts[i] = facts[i - 1] * i;
    const out = [f(x0)];
    let g = f;
    for (let k = 1; k <= n; k++) {
      g = C.derivative(g, { method: 'central', h: 1e-4 });
      out.push(g(x0) / facts[k]);
    }
    return out;
  };

  /** Evaluate a Taylor polynomial from precomputed coefficients. */
  C.evalTaylor = (coeffs, x0, x) => {
    let s = 0;
    for (let k = coeffs.length - 1; k >= 0; k--) s = s * (x - x0) + coeffs[k];
    return s;
  };

  /** Numeric limit f(x) as x -> x0 (two-sided if not provided). */
  C.limit = (f, x0, side = 0, eps = 1e-7) => {
    if (side < 0) return f(x0 - eps);
    if (side > 0) return f(x0 + eps);
    return 0.5 * (f(x0 - eps) + f(x0 + eps));
  };

  /** Does the sequence a_n converge? Returns estimated limit + residual. */
  C.sequenceLimit = (a, N = 400) => {
    let prev = a(N), last = a(N + 1);
    for (let k = N + 1; k < N + 200; k++) {
      const v = a(k);
      if (Math.abs(v - prev) < 1e-12) break;
      prev = last; last = v;
    }
    return { limit: last, residual: Math.abs(last - prev) };
  };

  /** Euler's method for y' = g(t,y). */
  C.euler = (g, y0, t0, t1, steps = 1000) => {
    const h = (t1 - t0) / steps;
    let t = t0, y = y0.slice();
    const pts = [[t, y.slice()]];
    for (let i = 0; i < steps; i++) {
      const d = g(t, y);
      y = X.V.madd(y.slice(), d, h);
      t += h;
      pts.push([t, y.slice()]);
    }
    return pts;
  };

  /** Work done by force F over a straight path from p0 to p1. */
  C.workLine = (F, p0, p1, n = 128) => {
    const h = 1 / n;
    let w = 0;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) * h;
      const p = X.V.linComb([1 - t, t], [p0, p1]);
      const d = X.V.sub(p1, p0);
      w += X.V.dot(F(p), d) * h;
    }
    return w;
  };

  C._gaussLegendreNodes = gaussLegendre;
  C._richardsonTable = (f, x, h, levels) => C.richardsonDiff(f, x, h, levels);

  global.Calculus = C;
})(window);
