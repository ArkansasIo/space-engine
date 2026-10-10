/**
 * bodyModel.ts — read access to the normalised `bodies` table.
 *
 * The authoritative scene lives in `simulations.settings`; this table exists
 * for cross-simulation queries and aggregations.
 */
import { query } from '@database/pool';
import type { Body, BodyRow } from '@/types';

export function mapBody(row: BodyRow): Body {
  return {
    id: row.id,
    simulationId: row.simulation_id,
    name: row.name,
    kind: row.kind,
    mass: row.mass,
    radius: row.radius,
    posX: row.pos_x,
    posY: row.pos_y,
    velX: row.vel_x,
    velY: row.vel_y,
    color: row.color,
    temperature: row.temperature,
    luminosity: row.luminosity,
    spin: row.spin,
    isFixed: row.is_fixed === 1,
    trailLength: row.trail_length,
    createdAt: row.created_at.toISOString()
  };
}

export async function listForSimulation(simulationId: number): Promise<Body[]> {
  const rows = await query<BodyRow[]>(
    'SELECT * FROM `bodies` WHERE `simulation_id` = ? ORDER BY `id` ASC',
    [simulationId]
  );
  return rows.map(mapBody);
}

export async function listByKind(kind: Body['kind'], limit = 100): Promise<Body[]> {
  const rows = await query<BodyRow[]>(
    'SELECT * FROM `bodies` WHERE `kind` = ? ORDER BY `mass` DESC LIMIT ?',
    [kind, limit]
  );
  return rows.map(mapBody);
}

/** Aggregate: total bodies of each kind across the whole database. */
export async function kindHistogram(): Promise<Array<{ kind: string; total: number }>> {
  const rows = await query<BodyRow[]>(
    'SELECT `kind`, COUNT(*) AS total FROM `bodies` GROUP BY `kind` ORDER BY total DESC'
  );
  return (rows as unknown as Array<{ kind: string; total: number }>).map((r) => ({
    kind: r.kind,
    total: Number(r.total)
  }));
}

/** Ten heaviest bodies of a simulation. */
export async function heaviest(simulationId: number, limit = 10): Promise<Body[]> {
  const rows = await query<BodyRow[]>(
    'SELECT * FROM `bodies` WHERE `simulation_id` = ? ORDER BY `mass` DESC LIMIT ?',
    [simulationId, limit]
  );
  return rows.map(mapBody);
}
