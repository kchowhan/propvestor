import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseBody } from '../validators/common.js';
import { AppError } from '../lib/errors.js';

describe('Validators', () => {
  describe('parseBody', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().positive(),
    });

    it('should parse valid body', () => {
      const body = {
        name: 'Test User',
        email: 'test@example.com',
        age: 25,
      };

      const result = parseBody(testSchema, body);
      expect(result).toEqual(body);
    });

    it('should throw AppError for invalid data', () => {
      const body = {
        name: '',
        email: 'invalid-email',
        age: -5,
      };

      expect(() => parseBody(testSchema, body)).toThrow(AppError);
    });

    it('should throw AppError for missing fields', () => {
      const body = {
        name: 'Test User',
      };

      expect(() => parseBody(testSchema, body)).toThrow(AppError);
    });

    it('should handle optional fields', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email().optional(),
      });

      const body1 = { name: 'Test', email: 'test@example.com' };
      const body2 = { name: 'Test' };

      expect(parseBody(schema, body1).email).toBe('test@example.com');
      expect(parseBody(schema, body2).email).toBeUndefined();
    });

    it('should handle nullable fields', () => {
      const schema = z.object({
        name: z.string(),
        notes: z.string().nullable(),
      });

      const body1 = { name: 'Test', notes: 'Some notes' };
      const body2 = { name: 'Test', notes: null };

      expect(parseBody(schema, body1).notes).toBe('Some notes');
      expect(parseBody(schema, body2).notes).toBeNull();
    });
  });
});

