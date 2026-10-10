/**
 * seed.ts — loads database/seed.sql.
 *
 * Usage:  npm run db:seed
 */
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import { runScript } from '@database/sqlRunner';

const SEED_FILE = path.resolve(process.cwd(), '..', 'database', 'seed.sql');

export async function seed(): Promise<void> {
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(`Seed file not found at ${SEED_FILE}`);
  }
  const sql = fs.readFileSync(SEED_FILE, 'utf8');

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: false,
    connectTimeout: env.db.connectTimeout
  });

  try {
    const count = await runScript(sql, (statement) => conn.query(statement));
    logger.info(`Executed ${count} statements from seed.sql`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seed complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed failed', err);
      process.exit(1);
    });
}
