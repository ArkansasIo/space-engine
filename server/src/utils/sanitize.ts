/**
 * sanitize.ts — small input hygiene helpers.
 */

/** Strip characters that have no place in a username. */
export function sanitizeUsername(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_.-]/g, '');
}

/** Lower-case + trim an email. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Collapse whitespace and trim. */
export function collapse(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Escape a string for safe use inside a SQL LIKE pattern. */
export function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Is the value a plain object (not array/null)? */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
