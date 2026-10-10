/**
 * menu.ts — the top menu bar.
 */
import { PRESETS } from '../sim/presets';

export interface MenuCallbacks {
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onPreset: (key: string) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onClear: () => void;
  onToggleTrails: () => void;
  onToggleGrid: () => void;
  onToggleVelocity: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onExperiments: () => void;
}

interface MenuItem {
  label: string;
  action?: () => void;
  separator?: boolean;
  checked?: boolean;
}

export class Menu {
  private root: HTMLElement;
  private openMenu: HTMLElement | null = null;
  private callbacks: MenuCallbacks;
  private state = { trails: true, grid: true, velocity: false, playing: false };

  constructor(root: HTMLElement, callbacks: MenuCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.build();
    document.addEventListener('click', (e) => {
      if (this.openMenu && !this.openMenu.contains(e.target as Node)) this.closeAll();
    });
  }

  /** Reflect playback / render flags in the menu labels. */
  update(state: Partial<typeof this.state>): void {
    Object.assign(this.state, state);
    this.build();
  }

  private build(): void {
    const c = this.callbacks;
    this.root.innerHTML = '';

    const brand = document.createElement('div');
    brand.className = 'menubar-brand';
    brand.textContent = 'AstroSim';
    this.root.appendChild(brand);

    this.addDropdown('File', [
      { label: 'New Scene', action: c.onNew },
      { label: 'Open…', action: c.onOpen },
      { label: 'Save', action: c.onSave },
      { separator: true, label: '' },
      { label: 'Clear All', action: c.onClear }
    ]);

    this.addDropdown(
      'Presets',
      PRESETS.map((p) => ({ label: p.name, action: () => c.onPreset(p.key) }))
    );

    this.addDropdown('Simulate', [
      { label: this.state.playing ? 'Pause' : 'Play', action: c.onTogglePlay },
      { label: 'Reset', action: c.onReset },
      { separator: true, label: '' },
      { label: 'Experiments…', action: c.onExperiments }
    ]);

    this.addDropdown('View', [
      { label: 'Trails', checked: this.state.trails, action: c.onToggleTrails },
      { label: 'Grid', checked: this.state.grid, action: c.onToggleGrid },
      { label: 'Velocity Vectors', checked: this.state.velocity, action: c.onToggleVelocity }
    ]);

    this.addDropdown('Account', [
      { label: 'Log in…', action: c.onLogin },
      { label: 'Log out', action: c.onLogout }
    ]);
  }

  private addDropdown(label: string, items: MenuItem[]): void {
    const wrap = document.createElement('div');
    wrap.className = 'menubar-item';

    const button = document.createElement('button');
    button.className = 'menubar-button';
    button.textContent = label;
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains('open');
      this.closeAll();
      if (!isOpen) {
        wrap.classList.add('open');
        this.openMenu = wrap;
      }
    });

    const panel = document.createElement('div');
    panel.className = 'menubar-dropdown';

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'menubar-separator';
        panel.appendChild(sep);
        continue;
      }
      const el = document.createElement('button');
      el.className = 'menubar-entry';
      el.textContent = (item.checked ? '✓ ' : '') + item.label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAll();
        item.action?.();
      });
      panel.appendChild(el);
    }

    wrap.appendChild(button);
    wrap.appendChild(panel);
    this.root.appendChild(wrap);
  }

  private closeAll(): void {
    this.root.querySelectorAll('.menubar-item.open').forEach((el) => el.classList.remove('open'));
    this.openMenu = null;
  }
}
