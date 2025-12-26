import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';
import { rateLimit, strictRateLimit } from './middleware/rate-limit.js';
import { optionalAuth } from './middleware/auth.js';

export const createApp = () => {
  const app = express();
  
  // Support multiple CORS origins (comma-separated) or single origin
  // In development, allow common localhost ports
  const isDev = process.env.NODE_ENV !== 'production';
  const devOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
  
  let corsOrigins: string[] = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  
  // In development, merge configured origins with common dev ports
  if (isDev) {
    corsOrigins = [...new Set([...corsOrigins, ...devOrigins])];
  }
  
  const corsOptions = corsOrigins.includes('*')
    ? { origin: true, credentials: true } // Allow all origins (use with caution)
    : { 
        origin: corsOrigins,
        credentials: true 
      };
  
  app.use(cors(corsOptions));
  app.use(cookieParser());
  // Stripe webhooks require the raw request body for signature verification.
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  // Apply strict rate limiting to auth endpoints (before general rate limiting)
  // CodeQL: Rate limiting prevents DoS attacks on authentication endpoints
  app.use('/api/auth/login', strictRateLimit);
  app.use('/api/auth/register', strictRateLimit);

  // Apply general rate limiting to all API routes
  // Rate limiting needs auth context, so apply optionalAuth first for authenticated requests
  // CodeQL: Always enable rate limiting to prevent DoS attacks
  app.use('/api', optionalAuth, rateLimit);

  app.use('/api', router);

  app.use(errorHandler);
  return app;
};
