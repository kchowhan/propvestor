import { z, ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

export const parseBody = <T>(schema: ZodSchema<T>, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload.', result.error.flatten());
  }
  return result.data;
};

export const parseQuery = <T>(schema: ZodSchema<T>, query: unknown): T => {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters.', result.error.flatten());
  }
  return result.data;
};

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
