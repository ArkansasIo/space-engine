/**
 * experimentModel.ts — data access for the `experiments` table.
 */
import type { ResultSetHeader } from 'mysql2/promise';
import { query, execute } from '@database/pool';
import type { Experiment, ExperimentRow } from '@/types';

function parseJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function mapExperiment(row: ExperimentRow): Experiment {
  return {
    id: row.id,
    simulationId: row.simulation_id,
    userId: row.user_id,
    label: row.label,
    integralValue: row.integral_value,
    derivativeAt: row.derivative_at,
    energyDrift: row.energy_drift,
    samples: row.samples,
    result: parseJson(row.result),
    measuredAt: row.measured_at.toISOString()
  };
}

export interface CreateExperimentInput {
  simulationId?: number | null;
  userId: number;
  label: string;
  integralValue?: number | null;
  derivativeAt?: number | null;
  energyDrift?: number | null;
  samples?: number;
  result?: unknown;
}

export async function create(input: CreateExperimentInput): Promise<Experiment> {
  const res: ResultSetHeader = await execute(
    `INSERT INTO \`experiments\`
       (\`simulation_id\`, \`user_id\`, \`label\`, \`integral_value\`, \`derivative_at\`,
        \`energy_drift\`, \`samples\`, \`result\`)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.simulationId ?? null,
      input.userId,
      input.label,
      input.integralValue ?? null,
      input.derivativeAt ?? null,
      input.energyDrift ?? null,
      input.samples ?? 0,
      input.result === undefined ? null : JSON.stringify(input.result)
    ]
  );
  const exp = await findById(res.insertId);
  if (!exp) throw new Error('Failed to load freshly created experiment');
  return exp;
}

export async function findById(id: number): Promise<Experiment | null> {
  const rows = await query<ExperimentRow[]>(
    'SELECT * FROM `experiments` WHERE `id` = ? LIMIT 1',
    [id]
  );
  return rows.length ? mapExperiment(rows[0]) : null;
}

export async function listForUser(userId: number, limit = 50, offset = 0): Promise<Experiment[]> {
  const rows = await query<ExperimentRow[]>(
    `SELECT * FROM \`experiments\` WHERE \`user_id\` = ?
      ORDER BY \`measured_at\` DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows.map(mapExperiment);
}

export async function listForSimulation(simulationId: number): Promise<Experiment[]> {
  const rows = await query<ExperimentRow[]>(
    'SELECT * FROM `experiments` WHERE `simulation_id` = ? ORDER BY `measured_at` DESC',
    [simulationId]
  );
  return rows.map(mapExperiment);
}

export async function remove(id: number): Promise<void> {
  await execute('DELETE FROM `experiments` WHERE `id` = ?', [id]);
}

export async function countForUser(userId: number): Promise<number> {
  const rows = await query<ExperimentRow[]>(
    'SELECT COUNT(*) AS c FROM `experiments` WHERE `user_id` = ?',
    [userId]
  );
  return Number((rows[0] as unknown as { c: number }).c ?? 0);
}
