/**
 * utils.test.ts — unit tests for sanitise / password helpers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeUsername, normalizeEmail, escapeLike, collapse } from '../utils/sanitize';

test('sanitizeUsername strips illegal characters', () => {
  assert.equal(sanitizeUsername('  bob<script>  '), 'bobscript');
});

test('normalizeEmail lowercases and trims', () => {
  assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
});

test('collapse squeezes internal whitespace', () => {
  assert.equal(collapse('  a   b  '), 'a b');
});

test('escapeLike escapes wildcards', () => {
  assert.equal(escapeLike('50%_off'), '50\\%\\_off');
});
