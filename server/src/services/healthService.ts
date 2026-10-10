/**
 * healthService.ts — liveness/readiness probes.
 */
import { ping } from '@database/pool';
import { env } from '@config/env';

export interface HealthReport {
  status: 'ok' | 'degraded';
  uptime: number;
  env: string;
  database: 'up' | 'down';
  timestamp: string;
}

export async function report(): Promise<HealthReport> {
  const db = (await ping()) ? 'up' : 'down';
  return {
    status: db === 'up' ? 'ok' : 'degraded',
    uptime: Math.round(process.uptime()),
    env: env.nodeEnv,
    database: db,
    timestamp: new Date().toISOString()
  };
}
