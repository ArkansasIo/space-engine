/**
 * reset.ts — drops the schema and re-applies it, then seeds.
 *
 * Usage:  npm run db:reset
 * DESTRUCTIVE — only intended for development.
 */
import mysql from 'mysql2/promise';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import { migrate } from '@database/migrate';
import { seed } from '@database/seed';

export async function reset(): Promise<void> {
  if (env.isProd) {
    throw new Error('Refusing to reset the database while NODE_ENV=production');
  }

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    connectTimeout: env.db.connectTimeout
  });

  try {
    logger.warn(`Dropping database \`${env.db.name}\`…`);
    await conn.query(`DROP DATABASE IF EXISTS \`${env.db.name}\``);
  } finally {
    await conn.end();
  }

  await migrate();
  await seed();
}

if (require.main === module) {
  reset()
    .then(() => {
      logger.info('Reset complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Reset failed', err);
      process.exit(1);
    });
}
