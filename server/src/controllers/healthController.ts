/**
 * healthController.ts — liveness/readiness endpoints.
 */
import type { Request, Response, NextFunction } from 'express';
import * as healthService from '@services/healthService';
import { ok } from '@utils/response';

export async function live(_req: Request, res: Response): Promise<void> {
  ok(res, { status: 'ok', uptime: Math.round(process.uptime()) });
}

export async function ready(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const report = await healthService.report();
    res.status(report.status === 'ok' ? 200 : 503).json({ data: report });
  } catch (err) {
    next(err);
  }
}
