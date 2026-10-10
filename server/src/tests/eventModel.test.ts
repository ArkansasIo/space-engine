/**
 * eventModel.test.ts — unit tests for the api-event JSON mapping.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapEvent } from '../models/eventModel';
import type { ApiEventRow } from '../types';

type EventRowOverride = Omit<Partial<ApiEventRow>, 'constructor'>;

function row(over: EventRowOverride = {}): ApiEventRow {
  return {
    id: 1,
    user_id: 7,
    event_type: 'sim.create',
    entity: 'simulation',
    entity_id: 42,
    detail: '{"bodyCount":2}',
    ip_address: '127.0.0.1',
    user_agent: 'node-test',
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...over
  } as ApiEventRow;
}

test('mapEvent decodes JSON detail and camelCases fields', () => {
  const e = mapEvent(row());
  assert.equal(e.userId, 7);
  assert.equal(e.eventType, 'sim.create');
  assert.deepEqual(e.detail, { bodyCount: 2 });
  assert.equal(e.entityId, 42);
});

test('mapEvent tolerates already-parsed detail objects', () => {
  const e = mapEvent(row({ detail: { ok: true } as unknown as string }));
  assert.deepEqual(e.detail, { ok: true });
});

test('mapEvent keeps null detail null', () => {
  const e = mapEvent(row({ detail: null }));
  assert.equal(e.detail, null);
});
