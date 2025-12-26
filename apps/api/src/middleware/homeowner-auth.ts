import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AuthPayload } from './auth.js';
import { HOMEOWNER_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from '../lib/auth-cookies.js';

export interface HomeownerAuthPayload {
  homeownerId: string;
  associationId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    homeownerAuth?: HomeownerAuthPayload;
    isSuperAdminImpersonating?: boolean; // Flag to indicate superadmin is viewing as homeowner
  }
}

export const requireHomeownerAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const bearerToken = header && header.startsWith('Bearer ') ? header.replace('Bearer ', '') : null;
  const homeownerCookie = req.cookies?.[HOMEOWNER_SESSION_COOKIE_NAME] as string | undefined;
  const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const token = bearerToken || homeownerCookie || sessionCookie;

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing authorization header.'));
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as HomeownerAuthPayload | AuthPayload;
    
    // Check if it's a homeowner token
    if ('homeownerId' in payload && payload.homeownerId) {
      req.homeownerAuth = payload as HomeownerAuthPayload;
      return next();
    }

    // Check if it's a user token and user is superadmin
    if ('userId' in payload && payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isSuperAdmin: true },
      });

      if (user?.isSuperAdmin) {
        // Superadmin can access homeowner portal by providing homeownerId in query params
        const homeownerId = req.query.homeownerId as string;
        if (!homeownerId) {
          return next(new AppError(400, 'BAD_REQUEST', 'Superadmin access requires homeownerId query parameter.'));
        }

        // Verify homeowner exists and get associationId
        const homeowner = await prisma.homeowner.findUnique({
          where: { id: homeownerId },
          select: { id: true, associationId: true },
        });

        if (!homeowner) {
          return next(new AppError(404, 'NOT_FOUND', 'Homeowner not found.'));
        }

        req.homeownerAuth = {
          homeownerId: homeowner.id,
          associationId: homeowner.associationId,
        };
        req.isSuperAdminImpersonating = true;
        return next();
      }
    }

    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid token type.'));
  } catch (err) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
};

// Optional homeowner auth - sets req.homeownerAuth if token is provided, but doesn't throw error if missing
export const optionalHomeownerAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const bearerToken = header && header.startsWith('Bearer ') ? header.replace('Bearer ', '') : null;
  const homeownerCookie = req.cookies?.[HOMEOWNER_SESSION_COOKIE_NAME] as string | undefined;
  const token = bearerToken || homeownerCookie;

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as HomeownerAuthPayload;
      if (payload.homeownerId) {
        req.homeownerAuth = payload;
      }
    } catch (err) {
      // Ignore errors for optional auth
    }
  }
  return next();
};
