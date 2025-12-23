import { describe, it, expect } from 'vitest';
import { AppError, errorResponse } from '../../lib/errors.js';

describe('Errors Library', () => {
  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(404, 'NOT_FOUND', 'Resource not found', { id: '123' });

      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.details).toEqual({ id: '123' });
      expect(error instanceof Error).toBe(true);
    });

    it('should create AppError without details', () => {
      const error = new AppError(401, 'UNAUTHORIZED', 'Unauthorized');

      expect(error.status).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized');
      expect(error.details).toBeUndefined();
    });
  });

  describe('errorResponse', () => {
    it('should format AppError response correctly', () => {
      const error = new AppError(404, 'NOT_FOUND', 'Resource not found', { id: '123' });
      const response = errorResponse(error);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Resource not found');
      expect(response.body.error.details).toEqual({ id: '123' });
    });

    it('should format generic Error response correctly', () => {
      const error = new Error('Unexpected error');
      const response = errorResponse(error);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Unexpected error.');
    });

    it('should handle all error codes', () => {
      const codes = ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'CONFLICT', 'BAD_REQUEST', 'INTERNAL_ERROR'] as const;
      
      codes.forEach((code) => {
        const error = new AppError(400, code, `Test ${code}`);
        const response = errorResponse(error);
        expect(response.body.error.code).toBe(code);
      });
    });
  });
});

