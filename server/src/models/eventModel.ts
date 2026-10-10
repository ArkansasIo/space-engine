/**
 * eventModel.ts — append-only audit/telemetry writer for `api_events`.
 */
import { query } from '@database/pool';
import { logger } from '@utils/logger';
import type { EventType } from '@config/constants';
import type { ApiEvent, ApiEventRow } from '@/types';

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

export function mapEvent(row: ApiEventRow): ApiEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    entity: row.entity,
    entityId: row.entity_id,
    detail: parseJson(row.detail),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString()
  };
}

export interface RecordEventInput {
  userId?: number | null;
  eventType: string;
  entity?: string | null;
  entityId?: number | null;
  detail?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Fire-and-forget write. Telemetry must never break a request, so failures
 * are logged and swallowed.
 */
export async function record(input: RecordEventInput): Promise<void> {
  try {
    await query(
      `INSERT INTO \`api_events\`
         (\`user_id\`, \`event_type\`, \`entity\`, \`entity_id\`, \`detail\`, \`ip_address\`, \`user_agent\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.userId ?? null,
        input.eventType,
        input.entity ?? null,
        input.entityId ?? null,
        input.detail === undefined ? null : JSON.stringify(input.detail),
        input.ipAddress ?? null,
        input.userAgent ? input.userAgent.slice(0, 255) : null
      ]
    );
  } catch (err) {
    logger.warn('Failed to record api event', { eventType: input.eventType, err });
  }
}

export async function recent(limit = 100): Promise<ApiEvent[]> {
  const rows = await query<ApiEventRow[]>(
    'SELECT * FROM `api_events` ORDER BY `created_at` DESC LIMIT ?',
    [limit]
  );
  return rows.map(mapEvent);
}

export async function countByType(eventType: string): Promise<number> {
  const rows = await query<ApiEventRow[]>(
    'SELECT COUNT(*) AS c FROM `api_events` WHERE `event_type` = ?',
    [eventType]
  );
  return Number((rows[0] as unknown as { c: number }).c ?? 0);
}

export async function purgeOlderThan(days: number): Promise<number> {
  const rows = await query<ApiEventRow[]>(
    'DELETE FROM `api_events` WHERE `created_at` < (NOW() - INTERVAL ? DAY)',
    [days]
  );
  return Array.isArray(rows) ? rows.length : 0;
}

export type { EventType };
