/**
 * eventService.ts — thin wrapper that turns audit writes into one call site.
 */
import * as eventModel from '@models/eventModel';
import type { EventType } from '@config/constants';

export interface AuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RecordInput {
  userId?: number | null;
  eventType: EventType | string;
  entity?: string | null;
  entityId?: number | null;
  detail?: unknown;
}

/** Persist an audit event, attaching request context when available. */
export async function record(ctx: AuditContext, input: RecordInput): Promise<void> {
  await eventModel.record({
    userId: input.userId ?? null,
    eventType: input.eventType,
    entity: input.entity ?? null,
    entityId: input.entityId ?? null,
    detail: input.detail,
    ipAddress: ctx.ipAddress ?? null,
    userAgent: ctx.userAgent ?? null
  });
}

export function recent(limit = 100) {
  return eventModel.recent(limit);
}

export function countByType(eventType: string) {
  return eventModel.countByType(eventType);
}
