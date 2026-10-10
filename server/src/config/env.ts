/**
 * env.ts — loads and validates process environment.
 */
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

// Load `.env` from the repo root, then fall back to the server package folder.
loadDotenv({ path: path.resolve(process.cwd(), '.env') });
loadDotenv({ path: path.resolve(process.cwd(), '..', '.env') });

function str(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(v);
}

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppEnv {
  readonly nodeEnv: NodeEnv;
  readonly isProd: boolean;
  readonly isDev: boolean;
  readonly isTest: boolean;

  readonly port: number;
  readonly host: string;
  readonly corsOrigins: string[];
  readonly trustProxy: boolean;

  readonly db: {
    readonly host: string;
    readonly port: number;
    readonly user: string;
    readonly password: string;
    readonly name: string;
    readonly connectionLimit: number;
    readonly queueLimit: number;
    readonly connectTimeout: number;
    readonly ssl: boolean;
    readonly sslCa: string;
  };

  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptRounds: number;

  readonly rateLimitWindowMs: number;
  readonly rateLimitMax: number;
  readonly jsonBodyLimit: string;
  readonly maxSimulationsPerUser: number;
  readonly maxBodiesPerSimulation: number;

  readonly logLevel: string;
  readonly logPretty: boolean;
  readonly serveClient: boolean;
  readonly clientDist: string;
}

const nodeEnv = (str('NODE_ENV', 'development') as NodeEnv) ?? 'development';

export const env: AppEnv = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isDev: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  port: num('PORT', 4000),
  host: str('HOST', '127.0.0.1'),
  corsOrigins: str('CORS_ORIGINS', 'http://localhost:5173,http://localhost:4000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: bool('TRUST_PROXY', false),

  db: {
    host: str('DB_HOST', '127.0.0.1'),
    port: num('DB_PORT', 3306),
    user: str('DB_USER', 'root'),
    password: str('DB_PASSWORD', ''),
    name: str('DB_NAME', 'astrosim'),
    connectionLimit: num('DB_CONNECTION_LIMIT', 10),
    queueLimit: num('DB_QUEUE_LIMIT', 0),
    connectTimeout: num('DB_CONNECT_TIMEOUT', 10000),
    ssl: bool('DB_SSL', false),
    sslCa: str('DB_SSL_CA', '')
  },

  jwtSecret: str('JWT_SECRET', 'dev_only_secret_change_me_min_32_chars_long'),
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),
  bcryptRounds: num('BCRYPT_ROUNDS', 10),

  rateLimitWindowMs: num('RATE_LIMIT_WINDOW_MS', 900000),
  rateLimitMax: num('RATE_LIMIT_MAX', 300),
  jsonBodyLimit: str('JSON_BODY_LIMIT', '2mb'),
  maxSimulationsPerUser: num('MAX_SIMULATIONS_PER_USER', 50),
  maxBodiesPerSimulation: num('MAX_BODIES_PER_SIMULATION', 500),

  logLevel: str('LOG_LEVEL', 'info'),
  logPretty: bool('LOG_PRETTY', true),
  serveClient: bool('SERVE_CLIENT', false),
  clientDist: path.resolve(process.cwd(), '..', 'client', 'dist')
};

if (env.isProd && env.jwtSecret.includes('dev_only')) {
  throw new Error('JWT_SECRET must be set to a secure value in production.');
}
