/**
 * logger.ts — tiny leveled logger with optional colour output.
 */
import { env } from '@config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const COLOURS: Record<Level, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m'
};
const RESET = '\x1b[0m';

const threshold = LEVELS[(env.logLevel as Level) in LEVELS ? (env.logLevel as Level) : 'info'];

function emit(level: Level, msg: string, meta?: unknown): void {
  if (LEVELS[level] < threshold) return;
  const ts = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const head = env.logPretty
    ? `${COLOURS[level]}${ts} ${tag}${RESET}`
    : `${ts} ${tag}`;
  if (meta === undefined) {
    console.log(`${head} ${msg}`);
  } else {
    console.log(`${head} ${msg}`, meta);
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta)
};

export type Logger = typeof logger;
