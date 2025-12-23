import { z, ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

export const parseBody = <T>(schema: ZodSchema<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload.', result.error.flatten());
  }
  return result.data;
};

export const uuidSchema = z.string().uuid();
