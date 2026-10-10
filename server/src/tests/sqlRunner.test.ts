/**
* sqlRunner.test.ts — unit tests for the SQL statement splitter.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitStatements, stripComments } from '../database/sqlRunner';

test('stripComments removes line comments', () => {
  const out = stripComments('SELECT 1; -- a comment\nSELECT 2;');
  assert.ok(!out.includes('a comment'));
  assert.ok(out.includes('SELECT 1'));
});

test('stripComments removes block comments', () => {
  const out = stripComments('SELECT 1; /* gone */ SELECT 2;');
  assert.ok(!out.includes('gone'));
});

test('splitStatements splits on top-level semicolons', () => {
  const stmts = splitStatements('CREATE TABLE a (x INT); CREATE TABLE b (y INT);');
  assert.equal(stmts.length, 2);
  assert.ok(stmts[0].startsWith('CREATE TABLE a'));
});

test('splitStatements ignores semicolons inside string literals', () => {
  const stmts = splitStatements("INSERT INTO t VALUES ('a;b');");
  assert.equal(stmts.length, 1);
  assert.ok(stmts[0].includes("'a;b'"));
});

test('splitStatements drops empty statements', () => {
  const stmts = splitStatements('SELECT 1;;; SELECT 2;');
  assert.equal(stmts.length, 2);
});
