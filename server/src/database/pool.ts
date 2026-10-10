/**
 * pool.ts — MySQL connection pool (mysql2/promise).
 */
import mysql from 'mysql2/promise';
import type {
  Pool,
  PoolOptions,
  RowDataPacket,
  ResultSetHeader,
  ExecuteValues
} from 'mysql2/promise';
import { env } from '@config/env';

const options: PoolOptions = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: env.db.queueLimit,
  connectTimeout: env.db.connectTimeout,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  multipleStatements: false
};

if (env.db.ssl) {
  options.ssl = env.db.sslCa
    ? { ca: env.db.sslCa, rejectUnauthorized: true }
    : { rejectUnauthorized: true };
}

export const pool: Pool = mysql.createPool(options);

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as ExecuteValues);
  return result;
}

/** True when the database answers a trivial ping. */
export async function ping(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.ping();
      return true;
    } finally {
      conn.release();
    }
  } catch {
    return false;
  }
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export type { RowDataPacket, ResultSetHeader };
