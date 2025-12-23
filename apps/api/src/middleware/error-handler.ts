import { NextFunction, Request, Response } from 'express';
import { AppError, errorResponse } from '../lib/errors.js';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const response = errorResponse(new AppError(409, 'CONFLICT', 'Resource already exists.'));
      return res.status(response.status).json(response.body);
    }
  }

  const response = errorResponse(err);
  return res.status(response.status).json(response.body);
};
