/**
 * renderer.ts — canvas 2-D renderer for the simulation.
 */
import type { Body } from '../sim/body';
import { MIN_ZOOM, MAX_ZOOM } from '../sim/constants';
import { clamp } from '../lib/mathx';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface RenderOptions {
  showTrails: boolean;
  showGrid: boolean;
  showVelocity: boolean;
  glow: boolean;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  showTrails: true,
  showGrid: true,
  showVelocity: false,
  glow: true
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  camera: Camera = { x: 0, y: 0, zoom: 1 };
  options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS };

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  /** Match the backing store to the CSS size × device pixel ratio. */
  resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * this.dpr));
    const h = Math.max(1, Math.floor(rect.height * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  get width(): number {
    return this.canvas.width / this.dpr;
  }

  get height(): number {
    return this.canvas.height / this.dpr;
  }

  /** Screen point -> world point. */
  screenToWorld(sx: number, sy: number): [number, number] {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return [(sx - cx) / this.camera.zoom + this.camera.x, (sy - cy) / this.camera.zoom + this.camera.y];
  }

  /** World point -> screen point. */
  worldToScreen(wx: number, wy: number): [number, number] {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return [(wx - this.camera.x) * this.camera.zoom + cx, (wy - this.camera.y) * this.camera.zoom + cy];
  }

  zoomBy(factor: number, pivot?: [number, number]): void {
    const before = pivot ? this.screenToWorld(pivot[0], pivot[1]) : null;
    this.camera.zoom = clamp(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    if (before && pivot) {
      const after = this.screenToWorld(pivot[0], pivot[1]);
      this.camera.x += before[0] - after[0];
      this.camera.y += before[1] - after[1];
    }
  }

  pan(dxScreen: number, dyScreen: number): void {
    this.camera.x -= dxScreen / this.camera.zoom;
    this.camera.y -= dyScreen / this.camera.zoom;
  }

  /** Draw a single frame. */
  render(bodies: Body[]): void {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    if (this.options.showGrid) this.drawGrid();
    if (this.options.showTrails) this.drawTrails(bodies);
    for (const b of bodies) this.drawBody(b);
    if (this.options.showVelocity) for (const b of bodies) this.drawVelocity(b);

    ctx.restore();
  }

  private drawBackground(): void {
    const { ctx } = this;
    const g = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    g.addColorStop(0, '#0b0e17');
    g.addColorStop(1, '#04050a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    const { ctx } = this;
    const step = 100 * this.camera.zoom;
    if (step < 12) return;
    const originX = this.worldToScreen(0, 0)[0];
    const originY = this.worldToScreen(0, 0)[1];

    ctx.strokeStyle = 'rgba(120, 150, 220, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = originX % step; x < this.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = originY % step; y < this.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
  }

  private drawTrails(bodies: Body[]): void {
    const { ctx } = this;
    ctx.lineWidth = 1;
    for (const b of bodies) {
      if (b.trail.length < 2) continue;
      ctx.strokeStyle = hexWithAlpha(b.color, 0.35);
      ctx.beginPath();
      const [sx, sy] = this.worldToScreen(b.trail[0][0], b.trail[0][1]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < b.trail.length; i++) {
        const [px, py] = this.worldToScreen(b.trail[i][0], b.trail[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  private drawBody(b: Body): void {
    const { ctx } = this;
    const [sx, sy] = this.worldToScreen(b.x, b.y);
    const r = Math.max(1.5, b.radius * this.camera.zoom);

    if (b.kind === 'blackhole') {
      // event horizon + photon ring
      if (this.options.glow) {
        ctx.shadowBlur = 24;
        ctx.shadowColor = b.color;
      }
      ctx.beginPath();
      ctx.arc(sx, sy, r * 1.4, 0, Math.PI * 2);
      ctx.strokeStyle = hexWithAlpha(b.color, 0.7);
      ctx.lineWidth = Math.max(1, 2 * this.camera.zoom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      return;
    }

    if (b.kind === 'star' || b.kind === 'neutron') {
      if (this.options.glow) {
        ctx.shadowBlur = b.kind === 'neutron' ? 30 : 18 + b.luminosity * 8;
        ctx.shadowColor = b.color;
      }
    }

    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, b.color);
    grad.addColorStop(1, hexWithAlpha(b.color, 0.15));
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;

    if (b.fixed) {
      ctx.beginPath();
      ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawVelocity(b: Body): void {
    const { ctx } = this;
    const [sx, sy] = this.worldToScreen(b.x, b.y);
    const scale = 6;
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + b.vx * scale, sy + b.vy * scale);
    ctx.stroke();
  }
}

/** Convert `#rrggbb` + alpha to an `rgba()` string. */
export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
