/**
 * authService.ts — registration, authentication and token issuance.
 */
import { env } from '@config/env';
import { EVENT_TYPES } from '@config/constants';
import * as userModel from '@models/userModel';
import { hashPassword, verifyPassword } from '@utils/password';
import { signToken } from '@utils/jwt';
import { conflict, unauthorized, forbidden } from '@utils/errors';
import { sanitizeUsername, normalizeEmail, collapse } from '@utils/sanitize';
import * as eventService from '@services/eventService';
import type { PublicUser } from '@/types';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
  expiresIn: string;
}

export async function register(input: RegisterInput, ctx: AuditContext = {}): Promise<AuthResult> {
  const username = sanitizeUsername(input.username);
  const email = normalizeEmail(input.email);

  if (await userModel.findByUsername(username)) {
    throw conflict('That username is already taken');
  }
  if (await userModel.findByEmail(email)) {
    throw conflict('That email address is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userModel.create({
    username,
    email,
    passwordHash,
    displayName: input.displayName ? collapse(input.displayName) : username
  });

  await eventService.record(ctx, {
    userId: user.id,
    eventType: EVENT_TYPES.AUTH_REGISTER,
    entity: 'user',
    entityId: user.id
  });

  return issue(user);
}

export async function login(
  username: string,
  password: string,
  ctx: AuditContext = {}
): Promise<AuthResult> {
  const row = await userModel.findByUsernameWithHash(sanitizeUsername(username));
  if (!row) throw unauthorized('Invalid username or password');
  if (row.is_active !== 1) throw forbidden('This account is disabled');

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) throw unauthorized('Invalid username or password');

  await userModel.touchLastLogin(row.id);
  const user = await userModel.findById(row.id);
  if (!user) throw unauthorized('Account no longer exists');

  await eventService.record(ctx, {
    userId: user.id,
    eventType: EVENT_TYPES.AUTH_LOGIN,
    entity: 'user',
    entityId: user.id
  });

  return issue(user);
}

export function logout(ctx: AuditContext = {}, userId?: number): Promise<void> {
  return eventService.record(ctx, {
    userId: userId ?? null,
    eventType: EVENT_TYPES.AUTH_LOGOUT,
    entity: 'user',
    entityId: userId ?? null
  });
}

function issue(user: { id: number; username: string; role: 'user' | 'admin' }): AuthResult {
  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: (user as unknown as PublicUser).displayName ?? null,
      role: user.role
    },
    token,
    expiresIn: env.jwtExpiresIn
  };
}

export interface AuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}
