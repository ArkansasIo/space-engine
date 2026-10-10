/**
 * authApi.ts — authentication endpoints.
 */
import { request, setToken, clearToken } from './client';
import type { AuthResult, PublicUser } from '../types';

export async function register(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResult> {
  const result = await request<AuthResult>('/auth/register', { method: 'POST', body: input });
  setToken(result.token);
  return result;
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/auth/login', {
    method: 'POST',
    body: { username, password }
  });
  setToken(result.token);
  return result;
}

export async function logout(): Promise<void> {
  try {
    await request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export function me(): Promise<PublicUser> {
  return request<PublicUser>('/auth/me');
}
