import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export interface AuthPayload {
  userId: string;
  organizationId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthPayload;
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing authorization header.'));
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.auth = payload;
    return next();
  } catch (err) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
};

// Optional auth - sets req.auth if token is provided, but doesn't throw error if missing
export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.replace('Bearer ', '');
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      req.auth = payload;
    } catch (err) {
      // Invalid token - just continue without setting req.auth
    }
  }
  return next();
};
