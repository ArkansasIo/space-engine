/**
 * presets.ts — built-in scene catalogue (mirrors database/seed.sql).
 */
import type { SceneSettings } from '../types';

export interface Preset {
  key: string;
  name: string;
  category: 'blackhole' | 'stellar' | 'orbital' | 'exotic' | 'sandbox';
  description: string;
  difficulty: number;
  settings: SceneSettings;
}

const gravity = (G = 1, softening = 4, relativistic = false) => ({ G, softening, relativistic });
const camera = (x = 0, y = 0, zoom = 1) => ({ x, y, zoom });

export const PRESETS: Preset[] = [
  {
    key: 'empty',
    name: 'Empty Sandbox',
    category: 'sandbox',
    description: 'A blank canvas — spawn whatever you like.',
    difficulty: 1,
    settings: { bodies: [], gravity: gravity(), camera: camera() }
  },
  {
    key: 'binary-stars',
    name: 'Binary Stars',
    category: 'stellar',
    description: 'Two equal stars locked in a mutual orbit.',
    difficulty: 2,
    settings: {
      bodies: [
        { name: 'Primary', kind: 'star', mass: 1200, radius: 16, x: -140, y: 0, vx: 0.9, vy: 0, color: '#ffd479', temperature: 5800, luminosity: 1.4 },
        { name: 'Secondary', kind: 'star', mass: 1200, radius: 16, x: 140, y: 0, vx: -0.9, vy: 0, color: '#ffb347', temperature: 5400, luminosity: 1.1 }
      ],
      gravity: gravity(),
      camera: camera()
    }
  },
  {
    key: 'solar-system-lite',
    name: 'Solar System (Lite)',
    category: 'orbital',
    description: 'A heavy central star with planets on near-circular orbits.',
    difficulty: 2,
    settings: {
      bodies: [
        { name: 'Sol', kind: 'star', mass: 90000, radius: 34, x: 0, y: 0, vx: 0, vy: 0, color: '#fff2b8', temperature: 5778, luminosity: 1, fixed: true },
        { name: 'Mercury', kind: 'planet', mass: 12, radius: 6, x: 220, y: 0, vx: 0, vy: -7.1, color: '#b8b0a4' },
        { name: 'Venus', kind: 'planet', mass: 26, radius: 9, x: 330, y: 0, vx: 0, vy: -5.8, color: '#e6c88a' },
        { name: 'Earth', kind: 'planet', mass: 30, radius: 10, x: 450, y: 0, vx: 0, vy: -4.9, color: '#5aa7e6' },
        { name: 'Mars', kind: 'planet', mass: 18, radius: 7, x: 600, y: 0, vx: 0, vy: -4.2, color: '#d9694a' }
      ],
      gravity: gravity(1, 6, false),
      camera: camera(0, 0, 0.75)
    }
  },
  {
    key: 'black-hole',
    name: 'Lone Black Hole',
    category: 'blackhole',
    description: 'A single Schwarzschild black hole.',
    difficulty: 3,
    settings: {
      bodies: [
        { name: 'Singularity', kind: 'blackhole', mass: 260000, radius: 22, x: 0, y: 0, vx: 0, vy: 0, color: '#8a2be2', spin: 0.7 }
      ],
      gravity: gravity(1, 2, true),
      camera: camera()
    }
  },
  {
    key: 'accretion',
    name: 'Accretion Disk',
    category: 'blackhole',
    description: 'A black hole with an infalling ring of dust.',
    difficulty: 4,
    settings: {
      bodies: [
        { name: 'Singularity', kind: 'blackhole', mass: 300000, radius: 24, x: 0, y: 0, vx: 0, vy: 0, color: '#ff6b35', spin: 0.9 },
        { name: 'dust-0', kind: 'dust', mass: 1, radius: 3, x: 180, y: 40, vx: 0, vy: -3.2, color: '#ffcf6b' },
        { name: 'dust-1', kind: 'dust', mass: 1, radius: 3, x: 140, y: -120, vx: 2.6, vy: 0, color: '#ffd479' },
        { name: 'dust-2', kind: 'dust', mass: 1, radius: 3, x: -170, y: 90, vx: 0, vy: 3.6, color: '#ffb347' },
        { name: 'dust-3', kind: 'dust', mass: 1, radius: 3, x: -130, y: -150, vx: -3.0, vy: 0, color: '#ffe0a3' }
      ],
      gravity: gravity(1, 3, true),
      camera: camera()
    }
  },
  {
    key: 'neutron-binary',
    name: 'Neutron Star Binary',
    category: 'exotic',
    description: 'Two ultra-dense neutron stars spiralling toward merger.',
    difficulty: 5,
    settings: {
      bodies: [
        { name: 'Pulsar-A', kind: 'neutron', mass: 42000, radius: 9, x: -70, y: 0, vx: 0, vy: 4.4, color: '#cfe8ff', luminosity: 0.4 },
        { name: 'Pulsar-B', kind: 'neutron', mass: 40000, radius: 9, x: 70, y: 0, vx: 0, vy: -4.6, color: '#9ecbff', luminosity: 0.4 }
      ],
      gravity: gravity(1, 2, true),
      camera: camera()
    }
  }
];

/** Look up a preset by key. */
export function getPreset(key: string): Preset | undefined {
  return PRESETS.find((p) => p.key === key);
}

/** Deep clone of a preset's scene so callers can mutate freely. */
export function presetScene(key: string): SceneSettings | null {
  const preset = getPreset(key);
  if (!preset) return null;
  return JSON.parse(JSON.stringify(preset.settings)) as SceneSettings;
}

/** Group presets by category. */
export function byCategory(): Record<string, Preset[]> {
  const out: Record<string, Preset[]> = {};
  for (const p of PRESETS) {
    (out[p.category] ??= []).push(p);
  }
  return out;
}
