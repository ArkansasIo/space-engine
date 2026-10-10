/**
 * authController.ts — HTTP layer for authentication.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '@services/authService';
import { toPublicUser } from '@models/userModel';
import * as userModel from '@models/userModel';
import { ok, created } from '@utils/response';
import { notFound } from '@utils/errors';
import { auditContext } from '@controllers/helpers';

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email().max(190),
  password: z.string().min(8).max(72),
  displayName: z.string().min(1).max(64).optional()
});

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(72)
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body, auditContext(req));
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const result = await authService.login(username, password, auditContext(req));
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(auditContext(req), req.user?.id);
    ok(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw notFound('No authenticated user');
    const user = await userModel.findById(req.user.id);
    if (!user) throw notFound('User not found');
    ok(res, toPublicUser(user));
  } catch (err) {
    next(err);
  }
}
