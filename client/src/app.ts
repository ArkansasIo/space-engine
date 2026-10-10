/**
 * app.ts — wires the simulation engine, renderer, menu, panels and input
 * handling into a single running application.
 *
 * `main.ts` is the DOM entry point; everything testable lives here.
 */
import { Engine } from './sim/engine';
import { Renderer } from './render/renderer';
import type { RenderOptions } from './render/renderer';
import { Menu } from './ui/menu';
import * as toast from './ui/toast';
import { PRESETS, presetScene } from './sim/presets';
import { KIND_COLORS, KIND_LABELS } from './sim/constants';
import type { BodyKind } from './sim/constants';
import { DEFAULT_GRAVITY } from './sim/gravity';
import type { SceneSettings } from './types';

const HUD_REFRESH_MS = 250;

export interface AppElements {
  menubar: HTMLElement;
  stage: HTMLCanvasElement;
  hud: HTMLElement;
  objectList: HTMLElement;
  inspector: HTMLElement;
  controlbar: HTMLElement;
}

/** Resolve the required DOM nodes, throwing early if the shell is malformed. */
export function queryElements(root: ParentNode = document): AppElements {
  const need = <T extends Element>(sel: string): T => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`AstroSim: missing required element ${sel}`);
    return el;
  };
  return {
    menubar: need<HTMLElement>('#menubar'),
    stage: need<HTMLCanvasElement>('#stage'),
    hud: need<HTMLElement>('#hud'),
    objectList: need<HTMLElement>('#object-list'),
    inspector: need<HTMLElement>('#inspector'),
    controlbar: need<HTMLElement>('#controlbar')
  };
}

export class App {
  readonly engine = new Engine();
  readonly renderer: Renderer;
  readonly menu: Menu;

  private els: AppElements;
  private selectedId: number | null = null;
  private rafId = 0;
  private lastFrame = 0;
  private lastHud = 0;
  private dragging = false;
  private lastPointer: [number, number] = [0, 0];

  constructor(els: AppElements, scene: SceneSettings = PRESETS[1].settings) {
    this.els = els;
    this.renderer = new Renderer(els.stage);

    this.renderer.options = {
      showTrails: true,
      showGrid: true,
      showVelocity: false,
      glow: true
    };

    this.engine.loadScene(scene);

    this.menu = new Menu(els.menubar, {
      onNew: () => this.newScene(),
      onSave: () => this.saveScene(),
      onOpen: () => toast.info('Open: not wired to the API in this build'),
      onPreset: (key) => this.loadPreset(key),
      onTogglePlay: () => this.togglePlay(),
      onReset: () => this.reset(),
      onClear: () => this.clear(),
      onToggleTrails: () => this.toggleRender('showTrails'),
      onToggleGrid: () => this.toggleRender('showGrid'),
      onToggleVelocity: () => this.toggleRender('showVelocity'),
      onLogin: () => toast.info('Login: not wired to the API in this build'),
      onLogout: () => toast.info('You are not signed in'),
      onExperiments: () => toast.info('Experiments: not wired to the API in this build')
    });

    this.bindInput();
    this.refreshPanels();
    this.updateHud(true);
  }

  /** Attach to the DOM and start the render loop. */
  start(): void {
    window.addEventListener('resize', () => this.renderer.resize());
    this.renderer.resize();
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /* ------------------------------------------------------------------ loop */

  private frame = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (this.engine.running) {
      this.engine.advance(dt);
      this.refreshPanels();
    }
    this.renderer.render(this.engine.bodies);
    this.updateHud(false, now);

    this.rafId = requestAnimationFrame(this.frame);
  };

  /* ------------------------------------------------------------- commands */

  private newScene(): void {
    this.engine.loadScene({
      bodies: [],
      gravity: { ...DEFAULT_GRAVITY },
      camera: { x: 0, y: 0, zoom: 1 }
    });
    this.selectedId = null;
    this.renderer.camera = { x: 0, y: 0, zoom: 1 };
    this.refreshPanels();
    toast.info('New empty scene');
  }

  private loadPreset(key: string): void {
    const scene = presetScene(key);
    if (!scene) {
      toast.warn(`Unknown preset: ${key}`);
      return;
    }
    this.engine.loadScene(scene);
    this.engine.rebaseEnergy();
    this.selectedId = null;
    this.renderer.camera = { ...scene.camera };
    this.refreshPanels();
    const preset = PRESETS.find((p) => p.key === key);
    toast.success(`Loaded preset: ${preset?.name ?? key}`);
  }

  private saveScene(): void {
    const scene = this.engine.toScene(this.renderer.camera);
    const json = JSON.stringify(scene, null, 2);
    try {
      void navigator.clipboard?.writeText(json);
      toast.success('Scene copied to clipboard as JSON');
    } catch {
      toast.info('Save: connect an account to persist scenes');
    }
  }

  private togglePlay(): void {
    this.engine.running = !this.engine.running;
    this.menu.update({ playing: this.engine.running });
    this.syncPlayButton();
  }

  private reset(): void {
    this.engine.running = false;
    this.engine.time = 0;
    this.engine.steps = 0;
    this.menu.update({ playing: false });
    this.syncPlayButton();
    toast.info('Simulation reset');
  }

  private clear(): void {
    this.engine.clear();
    this.selectedId = null;
    this.refreshPanels();
    toast.info('Cleared all bodies');
  }

  private toggleRender(key: keyof RenderOptions): void {
    this.renderer.options[key] = !this.renderer.options[key];
    this.menu.update({
      trails: this.renderer.options.showTrails,
      grid: this.renderer.options.showGrid,
      velocity: this.renderer.options.showVelocity
    });
  }

  /* ---------------------------------------------------------------- input */

  private bindInput(): void {
    const { stage } = this.els;

    stage.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastPointer = [e.clientX, e.clientY];
      stage.classList.add('grabbing');
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastPointer[0];
      const dy = e.clientY - this.lastPointer[1];
      this.lastPointer = [e.clientX, e.clientY];
      this.renderer.pan(dx, dy);
    });

    const endDrag = (): void => {
      this.dragging = false;
      stage.classList.remove('grabbing');
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    stage.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = stage.getBoundingClientRect();
        const pivot: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
        this.renderer.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, pivot);
      },
      { passive: false }
    );

    this.buildControlBar();
    this.els.objectList.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-body-id]');
      if (!card) return;
      const id = Number(card.dataset.bodyId);
      if (Number.isFinite(id)) {
        this.selectedId = id;
        this.refreshPanels();
      }
    });
  }

  private buildControlBar(): void {
    const bar = this.els.controlbar;
    bar.innerHTML = '';

    const play = this.button('▶ Play', 'play on', () => this.togglePlay());
    play.id = 'ctl-play';
    bar.appendChild(play);

    bar.appendChild(this.button('⟲ Reset', '', () => this.reset()));
    bar.appendChild(this.divider());

    const addKinds: BodyKind[] = ['star', 'planet', 'blackhole'];
    for (const kind of addKinds) {
      bar.appendChild(this.button(`+ ${KIND_LABELS[kind]}`, '', () => this.addBodyOfKind(kind)));
    }
  }

  private button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `icon-btn ${cls}`.trim();
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  private divider(): HTMLElement {
    const d = document.createElement('span');
    d.className = 'divider';
    return d;
  }

  private syncPlayButton(): void {
    const play = this.els.controlbar.querySelector<HTMLButtonElement>('#ctl-play');
    if (!play) return;
    play.textContent = this.engine.running ? '❚❚ Pause' : '▶ Play';
    play.classList.toggle('on', this.engine.running);
  }

  private addBodyOfKind(kind: BodyKind): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 80;
    const body = this.engine.addBody({
      kind,
      name: `${KIND_LABELS[kind]} ${this.engine.bodies.length + 1}`,
      color: KIND_COLORS[kind],
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: -Math.sin(angle) * 1.2,
      vy: Math.cos(angle) * 1.2
    });
    this.selectedId = body.id;
    this.engine.rebaseEnergy();
    this.refreshPanels();
    toast.success(`Added ${KIND_LABELS[kind]}`);
  }

  /* --------------------------------------------------------------- panels */

  private refreshPanels(): void {
    this.renderObjectList();
    this.renderInspector();
  }

  private renderObjectList(): void {
    const list = this.els.objectList;
    list.innerHTML = '';

    if (!this.engine.bodies.length) {
      const empty = document.createElement('p');
      empty.className = 'empty dim';
      empty.textContent = 'No bodies. Add one from the toolbar.';
      list.appendChild(empty);
      return;
    }

    for (const b of this.engine.bodies) {
      const card = document.createElement('div');
      card.className = 'obj-card' + (b.id === this.selectedId ? ' active' : '') +
        (b.kind === 'blackhole' ? ' is-hole' : '');
      card.dataset.bodyId = String(b.id);
      card.setAttribute('role', 'listitem');

      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = b.color;

      const meta = document.createElement('div');
      meta.className = 'meta';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = b.name;
      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = `${KIND_LABELS[b.kind] ?? b.kind} · m=${formatNum(b.mass)}`;
      meta.append(name, sub);

      card.append(swatch, meta);
      list.appendChild(card);
    }
  }

  private renderInspector(): void {
    const el = this.els.inspector;
    el.innerHTML = '';

    const body = this.selectedId == null ? undefined : this.engine.findBody(this.selectedId);
    if (!body) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No body selected.';
      el.appendChild(p);
      return;
    }

    el.appendChild(this.statSection('Body', [
      ['Name', body.name],
      ['Kind', KIND_LABELS[body.kind] ?? body.kind],
      ['Mass', formatNum(body.mass)],
      ['Radius', formatNum(body.radius)]
    ]));
    el.appendChild(this.statSection('State', [
      ['Position', `${formatNum(body.x)}, ${formatNum(body.y)}`],
      ['Velocity', `${formatNum(body.vx)}, ${formatNum(body.vy)}`],
      ['Speed', formatNum(body.speed)]
    ]));

    const kill = document.createElement('button');
    kill.type = 'button';
    kill.className = 'btn danger block';
    kill.textContent = 'Remove body';
    kill.addEventListener('click', () => {
      this.engine.removeBody(body.id);
      this.selectedId = null;
      this.refreshPanels();
    });
    el.appendChild(kill);
  }

  private statSection(title: string, rows: Array<[string, string]>): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';
    const h = document.createElement('h4');
    h.textContent = title;
    section.appendChild(h);

    for (const [k, v] of rows) {
      const row = document.createElement('div');
      row.className = 'stat';
      const ks = document.createElement('span');
      ks.className = 'k';
      ks.textContent = k;
      const vs = document.createElement('span');
      vs.className = 'v';
      vs.textContent = v;
      row.append(ks, vs);
      section.appendChild(row);
    }
    return section;
  }

  /* ------------------------------------------------------------------ hud */

  private updateHud(force: boolean, now = performance.now()): void {
    if (!force && now - this.lastHud < HUD_REFRESH_MS) return;
    this.lastHud = now;
    const e = this.engine;
    this.els.hud.innerHTML =
      `<b>AstroSim</b>\n` +
      `t = <b>${e.time.toFixed(2)}</b>s   steps = <span class="k">${e.steps}</span>\n` +
      `bodies = <b>${e.bodyCount}</b>   ${e.running ? 'running' : 'paused'}\n` +
      `energy drift = <span class="k">${(e.energyDrift * 100).toFixed(3)}%</span>\n` +
      `zoom = ${this.renderer.camera.zoom.toFixed(2)}x`;
  }
}

/** Compact numeric formatting for the panels / HUD. */
function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6 || (abs < 1e-3 && abs > 0)) return n.toExponential(2);
  return n.toFixed(abs >= 100 ? 0 : 2);
}
