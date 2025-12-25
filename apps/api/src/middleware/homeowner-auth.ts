import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

export interface HomeownerAuthPayload {
  homeownerId: string;
  associationId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    homeownerAuth?: HomeownerAuthPayload;
  }
}

export const requireHomeownerAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing authorization header.'));
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as HomeownerAuthPayload;
    
    // Verify it's a homeowner token (has homeownerId, not userId)
    if (!payload.homeownerId) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid token type.'));
    }

    req.homeownerAuth = payload;
    return next();
  } catch (err) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
};

// Optional homeowner auth - sets req.homeownerAuth if token is provided, but doesn't throw error if missing
export const optionalHomeownerAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as HomeownerAuthPayload;
    if (payload.homeownerId) {
      req.homeownerAuth = payload;
    }
  } catch (err) {
    // Ignore errors for optional auth
  }
  return next();
};

