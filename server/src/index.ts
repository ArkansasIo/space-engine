/**
 * index.ts — server entry point.
 */
import { createApp } from '@/app';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import { ping, closePool } from '@database/pool';

async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(env.port, env.host, () => {
    logger.info(`AstroSim API listening on http://${env.host}:${env.port} (${env.nodeEnv})`);
    ping().then((up) =>
      up
        ? logger.info('MySQL connection OK')
        : logger.warn('MySQL is not reachable — start the database and run `npm run db:migrate`')
    );
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down…`);
    server.close(async () => {
      try {
        await closePool();
      } catch (err) {
        logger.warn('Error closing DB pool', err);
      }
      process.exit(0);
    });
    // Force-exit if connections linger.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
