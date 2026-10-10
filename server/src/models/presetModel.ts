/**
 * presetModel.ts — data access for the `presets` table.
 */
import type { ResultSetHeader } from 'mysql2/promise';
import { query, execute } from '@database/pool';
import type { Preset, PresetRow, SceneSettings } from '@/types';
import type { PresetCategory } from '@config/constants';

function parseSettings(raw: unknown): SceneSettings {
  const obj = typeof raw === 'string' ? (JSON.parse(raw) as SceneSettings) : (raw as SceneSettings);
  return {
    bodies: Array.isArray(obj?.bodies) ? obj.bodies : [],
    gravity: obj?.gravity ?? { G: 1, softening: 4, relativistic: false },
    camera: obj?.camera ?? { x: 0, y: 0, zoom: 1 }
  };
}

export function mapPreset(row: PresetRow): Preset {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    category: row.category,
    description: row.description,
    difficulty: row.difficulty,
    settings: parseSettings(row.settings),
    isBuiltin: row.is_builtin === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString()
  };
}

export async function list(category?: PresetCategory): Promise<Preset[]> {
  const rows = category
    ? await query<PresetRow[]>(
      'SELECT * FROM `presets` WHERE `category` = ? ORDER BY `sort_order` ASC, `name` ASC',
      [category]
    )
    : await query<PresetRow[]>(
      'SELECT * FROM `presets` ORDER BY `category` ASC, `sort_order` ASC, `name` ASC'
    );
  return rows.map(mapPreset);
}

export async function findByKey(key: string): Promise<Preset | null> {
  const rows = await query<PresetRow[]>(
    'SELECT * FROM `presets` WHERE `key` = ? LIMIT 1',
    [key]
  );
  return rows.length ? mapPreset(rows[0]) : null;
}

export async function findById(id: number): Promise<Preset | null> {
  const rows = await query<PresetRow[]>('SELECT * FROM `presets` WHERE `id` = ? LIMIT 1', [id]);
  return rows.length ? mapPreset(rows[0]) : null;
}

export interface CreatePresetInput {
  key: string;
  name: string;
  category: PresetCategory;
  description?: string | null;
  difficulty?: number;
  settings: SceneSettings;
  isBuiltin?: boolean;
  sortOrder?: number;
}

export async function create(input: CreatePresetInput): Promise<Preset> {
  const res: ResultSetHeader = await execute(
    `INSERT INTO \`presets\`
       (\`key\`, \`name\`, \`category\`, \`description\`, \`difficulty\`, \`settings\`, \`is_builtin\`, \`sort_order\`)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)`,
    [
      input.key,
      input.name,
      input.category,
      input.description ?? null,
      input.difficulty ?? 1,
      JSON.stringify(input.settings),
      input.isBuiltin ? 1 : 0,
      input.sortOrder ?? 0
    ]
  );
  const preset = await findById(res.insertId);
  if (!preset) throw new Error('Failed to load freshly created preset');
  return preset;
}
