/**
 * healthApi.ts — readiness / liveness probes.
 */
import { request } from './client';

export interface HealthReport {
  status: 'ok' | 'degraded';
  uptime: number;
  env: string;
  database: 'up' | 'down';
  timestamp: string;
}

export interface LivenessReport {
  status: 'ok';
  uptime: number;
}

/** Readiness probe — rejects when the database is unreachable (503). */
export function health(): Promise<HealthReport> {
  return request<HealthReport>('/health');
}

export function ready(): Promise<HealthReport> {
  return request<HealthReport>('/health/ready');
}

/** Liveness probe — always succeeds while the API process is running. */
export function live(): Promise<LivenessReport> {
  return request<LivenessReport>('/health/live');
}
