/**
 * migrate.ts — applies database/schema.sql and records a checksum.
 *
 * Usage:  npm run db:migrate
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import { runScript } from '@database/sqlRunner';

const SCHEMA_FILE = path.resolve(process.cwd(), '..', 'database', 'schema.sql');

function checksum(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function migrate(): Promise<void> {
  if (!fs.existsSync(SCHEMA_FILE)) {
    throw new Error(`Schema file not found at ${SCHEMA_FILE}`);
  }
  const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');

  // Connect without a database so the CREATE DATABASE statement can run.
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: false,
    connectTimeout: env.db.connectTimeout
  });

  try {
    const count = await runScript(sql, (statement) => conn.query(statement));
    logger.info(`Applied ${count} statements from schema.sql`);

    // Record the migration if the bookkeeping table exists.
    try {
      const file = path.basename(SCHEMA_FILE);
      const sum = checksum(sql);
      await conn.query(`USE \`${env.db.name}\``);
      await conn.execute(
        `INSERT INTO \`schema_migrations\` (\`filename\`, \`checksum\`)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`checksum\` = VALUES(\`checksum\`)`,
        [file, sum]
      );
      logger.info(`Recorded migration ${file}`);
    } catch (err) {
      logger.warn('Could not record migration bookkeeping', err);
    }
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed', err);
      process.exit(1);
    });
}
