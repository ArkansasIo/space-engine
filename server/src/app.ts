/**
 * app.ts — builds and configures the Express application.
 */
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';

import { env } from '@config/env';
import routes from '@routes/index';
import { requestId } from '@middleware/requestId';
import { apiLimiter } from '@middleware/rateLimit';
import { notFoundHandler, errorHandler } from '@middleware/errorHandler';
import { logger } from '@utils/logger';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProd ? undefined : false,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true
    })
  );

  app.use(compression());
  app.use(express.json({ limit: env.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.jsonBodyLimit }));
  app.use(cookieParser());
  app.use(requestId);

  app.use(
    morgan(env.isProd ? 'combined' : 'dev', {
      skip: () => env.isTest
    })
  );

  // --- API ---
  app.use('/api', apiLimiter, routes);

  // --- optional static client (single-origin production deploy) ---
  if (env.serveClient && fs.existsSync(env.clientDist)) {
    app.use(express.static(env.clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(env.clientDist, 'index.html'));
    });
    logger.info(`Serving client from ${env.clientDist}`);
  } else {
    app.get('/', (_req, res) => {
      res.json({
        data: {
          name: 'AstroSim API',
          version: '1.0.0',
          docs: '/api/health'
        }
      });
    });
  }

  // --- error handling (must be last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
