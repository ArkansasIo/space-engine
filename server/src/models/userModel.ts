/**
 * userModel.ts — data access for the `users` table.
 */
import type { ResultSetHeader } from 'mysql2/promise';
import { query, execute } from '@database/pool';
import type { User, UserRow, PublicUser } from '@/types';

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  };
}

export async function findById(id: number): Promise<User | null> {
  const rows = await query<UserRow[]>(
    'SELECT * FROM `users` WHERE `id` = ? LIMIT 1',
    [id]
  );
  return rows.length ? mapUser(rows[0]) : null;
}

export async function findByUsername(username: string): Promise<User | null> {
  const rows = await query<UserRow[]>(
    'SELECT * FROM `users` WHERE `username` = ? LIMIT 1',
    [username]
  );
  return rows.length ? mapUser(rows[0]) : null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const rows = await query<UserRow[]>(
    'SELECT * FROM `users` WHERE `email` = ? LIMIT 1',
    [email]
  );
  return rows.length ? mapUser(rows[0]) : null;
}

/** Row including the password hash — used only by the auth service. */
export async function findByUsernameWithHash(username: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>(
    'SELECT * FROM `users` WHERE `username` = ? LIMIT 1',
    [username]
  );
  return rows.length ? rows[0] : null;
}

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string | null;
  role?: 'user' | 'admin';
}

export async function create(input: CreateUserInput): Promise<User> {
  const result: ResultSetHeader = await execute(
    `INSERT INTO \`users\` (\`username\`, \`email\`, \`password_hash\`, \`display_name\`, \`role\`)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.username,
      input.email,
      input.passwordHash,
      input.displayName ?? null,
      input.role ?? 'user'
    ]
  );
  const user = await findById(result.insertId);
  if (!user) throw new Error('Failed to load freshly created user');
  return user;
}

export async function touchLastLogin(id: number): Promise<void> {
  await execute('UPDATE `users` SET `last_login_at` = CURRENT_TIMESTAMP WHERE `id` = ?', [id]);
}

export async function list(limit = 100, offset = 0): Promise<User[]> {
  const rows = await query<UserRow[]>(
    'SELECT * FROM `users` ORDER BY `created_at` DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return rows.map(mapUser);
}

export async function count(): Promise<number> {
  const rows = await query<UserRow[]>('SELECT COUNT(*) AS c FROM `users`');
  return Number((rows[0] as unknown as { c: number }).c ?? 0);
}

export async function updateRole(id: number, role: 'user' | 'admin'): Promise<void> {
  await execute('UPDATE `users` SET `role` = ? WHERE `id` = ?', [role, id]);
}

export async function setActive(id: number, active: boolean): Promise<void> {
  await execute('UPDATE `users` SET `is_active` = ? WHERE `id` = ?', [active ? 1 : 0, id]);
}
