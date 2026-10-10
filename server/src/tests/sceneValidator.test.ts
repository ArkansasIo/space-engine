/**
 * sceneValidator.test.ts — unit tests for the scene normaliser.
 * Run with `npm test` (compiled to dist and executed by node --test).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateScene, validateBody } from '../services/sceneValidator';

test('validateBody clamps out-of-range values', () => {
  const b = validateBody(
    { name: 'X', kind: 'star', mass: 1e30, radius: -5, x: 1e12, y: 0, vx: 0, vy: 0, color: 'nope' },
    0
  );
  assert.equal(b.kind, 'star');
  assert.ok(b.mass <= 1e12);
  assert.ok(b.radius >= 0.5);
  assert.ok(b.x <= 1e7);
  assert.equal(b.color, '#ffcf6b');
});

test('validateBody rejects an unknown kind', () => {
  assert.throws(() =>
    validateBody({ name: 'X', kind: 'quasar', mass: 1, radius: 1, x: 0, y: 0, vx: 0, vy: 0, color: '#ffffff' }, 0)
  );
});

test('validateScene fills defaults for missing gravity/camera', () => {
  const scene = validateScene({ bodies: [] });
  assert.deepEqual(scene.bodies, []);
  assert.equal(scene.gravity.G, 1);
  assert.equal(scene.camera.zoom, 1);
});

test('validateScene rejects a non-array bodies field', () => {
  assert.throws(() => validateScene({ bodies: 'nope' }));
});

test('validateScene maps every body', () => {
  const scene = validateScene({
    bodies: [
      { name: 'A', kind: 'planet', mass: 1, radius: 6, x: 0, y: 0, vx: 0, vy: 0, color: '#ffffff' },
      { name: 'B', kind: 'blackhole', mass: 5, radius: 9, x: 1, y: 1, vx: 0, vy: 0, color: '#000000' }
    ]
  });
  assert.equal(scene.bodies.length, 2);
  assert.equal(scene.bodies[1].kind, 'blackhole');
});
