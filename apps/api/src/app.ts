import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';
import { rateLimit, strictRateLimit } from './middleware/rate-limit.js';
import { optionalAuth } from './middleware/auth.js';

export interface AppOptions {
  enableRateLimiting?: boolean;
}

export const createApp = (options: AppOptions = {}) => {
  const { enableRateLimiting = true } = options;
  const app = express();
  
  // Support multiple CORS origins (comma-separated) or single origin
  const corsOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  const corsOptions = corsOrigins.length === 1 && corsOrigins[0] === '*'
    ? { origin: true, credentials: true } // Allow all origins (use with caution)
    : { 
        origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
        credentials: true 
      };
  
  app.use(cors(corsOptions));
  app.use(express.json());

  // Apply strict rate limiting to auth endpoints (before general rate limiting)
  if (enableRateLimiting) {
    app.use('/api/auth/login', strictRateLimit);
    app.use('/api/auth/register', strictRateLimit);
  }

  // Apply general rate limiting to all API routes
  // Rate limiting needs auth context, so apply optionalAuth first for authenticated requests
  if (enableRateLimiting) {
    app.use('/api', optionalAuth, rateLimit);
  }

  app.use('/api', router);

  app.use(errorHandler);
  return app;
};
