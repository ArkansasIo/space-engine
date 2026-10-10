/**
 * simulationModel.ts — data access for `simulations` (+ normalised `bodies`).
 */
import type { ResultSetHeader, PoolConnection, ExecuteValues } from 'mysql2/promise';
import { query, execute, withTransaction } from '@database/pool';
import type { Simulation, SimulationRow, SceneSettings, PresetRow } from '@/types';

/** Parse the JSON column, which mysql2 may already have decoded. */
function parseSettings(raw: unknown): SceneSettings {
  const obj = typeof raw === 'string' ? (JSON.parse(raw) as SceneSettings) : (raw as SceneSettings);
  return {
    bodies: Array.isArray(obj?.bodies) ? obj.bodies : [],
    gravity: obj?.gravity ?? { G: 1, softening: 4, relativistic: false },
    camera: obj?.camera ?? { x: 0, y: 0, zoom: 1 }
  };
}

export function mapSimulation(row: SimulationRow): Simulation {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    presetKey: row.preset_key,
    bodyCount: row.body_count,
    seed: row.seed === null ? null : Number(row.seed),
    settings: parseSettings(row.settings),
    isPublic: row.is_public === 1,
    isArchived: row.is_archived === 1,
    playCount: row.play_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    owner: (row as SimulationRow & { owner?: string }).owner
  };
}

export interface ListOptions {
  userId?: number;
  onlyPublic?: boolean;
  includeArchived?: boolean;
  search?: string;
  presetKey?: string;
  limit: number;
  offset: number;
}

export async function findById(id: number): Promise<Simulation | null> {
  const rows = await query<SimulationRow[]>(
    `SELECT s.*, u.\`username\` AS owner
       FROM \`simulations\` s
       JOIN \`users\` u ON u.\`id\` = s.\`user_id\`
      WHERE s.\`id\` = ? LIMIT 1`,
    [id]
  );
  return rows.length ? mapSimulation(rows[0]) : null;
}

export async function list(opts: ListOptions): Promise<{ items: Simulation[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.userId !== undefined) {
    where.push('s.`user_id` = ?');
    params.push(opts.userId);
  }
  if (opts.onlyPublic) {
    where.push('s.`is_public` = 1');
  }
  if (!opts.includeArchived) {
    where.push('s.`is_archived` = 0');
  }
  if (opts.presetKey) {
    where.push('s.`preset_key` = ?');
    params.push(opts.presetKey);
  }
  if (opts.search) {
    where.push('(s.`name` LIKE ? OR s.`description` LIKE ?)');
    const like = `%${opts.search}%`;
    params.push(like, like);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRows = await query<SimulationRow[]>(
    `SELECT COUNT(*) AS c FROM \`simulations\` s ${clause}`,
    params
  );
  const total = Number((countRows[0] as unknown as { c: number }).c ?? 0);

  const rows = await query<SimulationRow[]>(
    `SELECT s.*, u.\`username\` AS owner
       FROM \`simulations\` s
       JOIN \`users\` u ON u.\`id\` = s.\`user_id\`
       ${clause}
      ORDER BY s.\`updated_at\` DESC
      LIMIT ? OFFSET ?`,
    [...params, opts.limit, opts.offset]
  );

  return { items: rows.map(mapSimulation), total };
}

export interface CreateSimulationInput {
  userId: number;
  name: string;
  description?: string | null;
  presetKey?: string | null;
  seed?: number | null;
  settings: SceneSettings;
  isPublic?: boolean;
}

/** Insert the simulation row and mirror its bodies inside one transaction. */
export async function create(input: CreateSimulationInput): Promise<Simulation> {
  const id = await withTransaction(async (conn) => {
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO \`simulations\`
         (\`user_id\`, \`name\`, \`description\`, \`preset_key\`, \`body_count\`, \`seed\`, \`settings\`, \`is_public\`)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        input.userId,
        input.name,
        input.description ?? null,
        input.presetKey ?? null,
        input.settings.bodies.length,
        input.seed ?? null,
        JSON.stringify(input.settings),
        input.isPublic ? 1 : 0
      ]
    );
    await insertBodies(conn, res.insertId, input.settings);
    return res.insertId;
  });

  const sim = await findById(id);
  if (!sim) throw new Error('Failed to load freshly created simulation');
  return sim;
}

async function insertBodies(
  conn: PoolConnection,
  simulationId: number,
  settings: SceneSettings
): Promise<void> {
  if (!settings.bodies.length) return;
  const values: unknown[] = [];
  const tuples = settings.bodies.map((b) => {
    values.push(
      simulationId,
      b.name,
      b.kind,
      b.mass,
      b.radius,
      b.x,
      b.y,
      b.vx,
      b.vy,
      b.color,
      b.temperature ?? 0,
      b.luminosity ?? 0,
      b.spin ?? 0,
      b.fixed ? 1 : 0,
      b.trailLength ?? 240
    );
    return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  });
  await conn.execute(
    `INSERT INTO \`bodies\`
       (\`simulation_id\`, \`name\`, \`kind\`, \`mass\`, \`radius\`, \`pos_x\`, \`pos_y\`,
        \`vel_x\`, \`vel_y\`, \`color\`, \`temperature\`, \`luminosity\`, \`spin\`,
        \`is_fixed\`, \`trail_length\`)
     VALUES ${tuples.join(', ')}`,
    values as ExecuteValues
  );
}

export interface UpdateSimulationInput {
  name?: string;
  description?: string | null;
  settings?: SceneSettings;
  isPublic?: boolean;
  isArchived?: boolean;
  presetKey?: string | null;
}

/** Update metadata and, when supplied, replace the mirrored bodies. */
export async function update(id: number, input: UpdateSimulationInput): Promise<Simulation> {
  await withTransaction(async (conn) => {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      sets.push('`name` = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push('`description` = ?');
      params.push(input.description);
    }
    if (input.presetKey !== undefined) {
      sets.push('`preset_key` = ?');
      params.push(input.presetKey);
    }
    if (input.isPublic !== undefined) {
      sets.push('`is_public` = ?');
      params.push(input.isPublic ? 1 : 0);
    }
    if (input.isArchived !== undefined) {
      sets.push('`is_archived` = ?');
      params.push(input.isArchived ? 1 : 0);
    }
    if (input.settings !== undefined) {
      sets.push('`settings` = CAST(? AS JSON)', '`body_count` = ?');
      params.push(JSON.stringify(input.settings), input.settings.bodies.length);
    }

    if (sets.length) {
      params.push(id);
      await conn.execute(
        `UPDATE \`simulations\` SET ${sets.join(', ')} WHERE \`id\` = ?`,
        params as ExecuteValues
      );
    }

    if (input.settings !== undefined) {
      await conn.execute('DELETE FROM `bodies` WHERE `simulation_id` = ?', [id]);
      await insertBodies(conn, id, input.settings);
    }
  });

  const sim = await findById(id);
  if (!sim) throw new Error('Simulation vanished during update');
  return sim;
}

export async function remove(id: number): Promise<void> {
  await execute('DELETE FROM `simulations` WHERE `id` = ?', [id]);
}

export async function incrementPlayCount(id: number): Promise<void> {
  await execute('UPDATE `simulations` SET `play_count` = `play_count` + 1 WHERE `id` = ?', [id]);
}

export async function countForUser(userId: number): Promise<number> {
  const rows = await query<SimulationRow[]>(
    'SELECT COUNT(*) AS c FROM `simulations` WHERE `user_id` = ? AND `is_archived` = 0',
    [userId]
  );
  return Number((rows[0] as unknown as { c: number }).c ?? 0);
}

/** Row returned by the `v_simulation_summary` view. */
export interface SimulationSummaryRow extends PresetRow {
  owner: string;
  black_holes: number;
  stars: number;
  planets: number;
}

export async function summary(limit = 20): Promise<SimulationSummaryRow[]> {
  return query<SimulationSummaryRow[]>(
    'SELECT * FROM `v_simulation_summary` LIMIT ?',
    [limit]
  );
}
