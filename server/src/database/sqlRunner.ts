/**
 * sqlRunner.ts — splits a .sql file into executable statements.
 *
 * mysql2 cannot run multiple statements unless `multipleStatements` is on,
 * so we strip comments and split on top-level semicolons ourselves. This is
 * adequate for our schema/seed files (no stored procedures, no DELIMITER).
 */

/** Remove `-- line` and `/* block *​/` comments, honouring quoted strings. */
export function stripComments(sql: string): string {
  let out = '';
  let i = 0;
  const n = sql.length;
  let quote: string | null = null;

  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];

    if (quote) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }

    // line comment
    if (c === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    // block comment
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    out += c;
    i++;
  }
  return out;
}

/** Split a script into individual statements on unquoted semicolons. */
export function splitStatements(sql: string): string[] {
  const clean = stripComments(sql);
  const statements: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];

    if (quote) {
      current += c;
      if (c === '\\') {
        current += clean[i + 1] ?? '';
        i++;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }

    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      current += c;
      continue;
    }

    if (c === ';') {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
      continue;
    }

    current += c;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
}

/** Execute every statement in a script in order. */
export async function runScript(
  sql: string,
  exec: (statement: string) => Promise<unknown>
): Promise<number> {
  const statements = splitStatements(sql);
  for (const statement of statements) {
    await exec(statement);
  }
  return statements.length;
}
