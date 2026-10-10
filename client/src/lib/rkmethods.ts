/**
 * rkmethods.ts — Runge–Kutta family ODE integrators.
 *
 * Every integrator steps a first-order system  y' = f(t, y)  and returns the
 * next state. The classic RK4 is the default used by the simulation engine.
 */
import type { Vec } from './mathx';

export type Derivative = (t: number, y: Vec) => Vec;

/** Advance one step with the explicit Euler method. */
export function eulerStep(f: Derivative, t: number, y: Vec, h: number): Vec {
  const k1 = f(t, y);
  const out = y.slice();
  for (let i = 0; i < out.length; i++) out[i] += h * k1[i];
  return out;
}

/** Midpoint (RK2) step. */
export function midpointStep(f: Derivative, t: number, y: Vec, h: number): Vec {
  const k1 = f(t, y);
  const ymid = y.map((v, i) => v + (h / 2) * k1[i]);
  const k2 = f(t + h / 2, ymid);
  return y.map((v, i) => v + h * k2[i]);
}

/** Heun's (improved Euler) step. */
export function heunStep(f: Derivative, t: number, y: Vec, h: number): Vec {
  const k1 = f(t, y);
  const yp = y.map((v, i) => v + h * k1[i]);
  const k2 = f(t + h, yp);
  return y.map((v, i) => v + (h / 2) * (k1[i] + k2[i]));
}

/** Classic 4th-order Runge–Kutta step. */
export function rk4Step(f: Derivative, t: number, y: Vec, h: number): Vec {
  const n = y.length;
  const k1 = f(t, y);

  const y2 = new Array<number>(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h / 2) * k1[i];
  const k2 = f(t + h / 2, y2);

  const y3 = new Array<number>(n);
  for (let i = 0; i < n; i++) y3[i] = y[i] + (h / 2) * k2[i];
  const k3 = f(t + h / 2, y3);

  const y4 = new Array<number>(n);
  for (let i = 0; i < n; i++) y4[i] = y[i] + h * k3[i];
  const k4 = f(t + h, y4);

  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    out[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return out;
}

/** Runge–Kutta–Fehlberg 4(5) adaptive step. */
export function rk45Step(
  f: Derivative,
  t: number,
  y: Vec,
  h: number,
  tol = 1e-6
): { y: Vec; hNext: number; error: number } {
  const n = y.length;
  const k1 = f(t, y);

  const y2 = new Array<number>(n);
  for (let i = 0; i < n; i++) y2[i] = y[i] + (h * 1) / 4 * k1[i];
  const k2 = f(t + h / 4, y2);

  const y3 = new Array<number>(n);
  for (let i = 0; i < n; i++) y3[i] = y[i] + (h * (3 / 32)) * k1[i] + (h * (9 / 32)) * k2[i];
  const k3 = f(t + (3 * h) / 8, y3);

  const y4 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y4[i] = y[i] + (h * (1932 / 2197)) * k1[i] - (h * (7200 / 2197)) * k2[i] + (h * (7296 / 2197)) * k3[i];
  }
  const k4 = f(t + (12 * h) / 13, y4);

  const y5 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y5[i] =
      y[i] +
      (h * (439 / 216)) * k1[i] -
      8 * h * k2[i] +
      (h * (3680 / 513)) * k3[i] -
      (h * (845 / 4104)) * k4[i];
  }
  const k5 = f(t + h, y5);

  const y6 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y6[i] =
      y[i] -
      (h * (8 / 27)) * k1[i] +
      2 * h * k2[i] -
      (h * (3544 / 2565)) * k3[i] +
      (h * (1859 / 4104)) * k4[i] -
      (h * (11 / 40)) * k5[i];
  }
  const k6 = f(t + h / 2, y6);

  // 4th-order solution
  const y4th = new Array<number>(n);
  // 5th-order solution
  const y5th = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    y4th[i] =
      y[i] +
      h *
      ((25 / 216) * k1[i] + (1408 / 2565) * k3[i] + (2197 / 4104) * k4[i] - (1 / 5) * k5[i]);
    y5th[i] =
      y[i] +
      h *
      ((16 / 135) * k1[i] +
        (6656 / 12825) * k3[i] +
        (28561 / 56430) * k4[i] -
        (9 / 50) * k5[i] +
        (2 / 55) * k6[i]);
  }

  let err = 0;
  for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(y5th[i] - y4th[i]));
  const hNext = err > 1e-12 ? h * Math.min(2, Math.max(0.5, Math.pow(tol / err, 0.2))) : h * 2;

  return { y: y5th, hNext, error: err };
}

/** Integrate a system over [t0, t1] with fixed-step RK4. */
export function integrate(
  f: Derivative,
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
    y = rk4Step(f, t, y, h);
    t += h;
    pts.push([t, y.slice()]);
  }
  return pts;
}

export type RKMethod = 'euler' | 'midpoint' | 'heun' | 'rk4';

/** Dispatch table for fixed-step methods. */
export const STEPPERS: Record<RKMethod, (f: Derivative, t: number, y: Vec, h: number) => Vec> = {
  euler: eulerStep,
  midpoint: midpointStep,
  heun: heunStep,
  rk4: rk4Step
};

export function step(method: RKMethod, f: Derivative, t: number, y: Vec, h: number): Vec {
  return STEPPERS[method](f, t, y, h);
}
