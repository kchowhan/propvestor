import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { router } from './routes/index.js';

export const createApp = () => {
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

  app.use('/api', router);

  app.use(errorHandler);
  return app;
};
