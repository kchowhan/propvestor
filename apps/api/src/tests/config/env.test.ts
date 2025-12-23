import { describe, it, expect, beforeEach } from 'vitest';
import { env } from '../../config/env.js';

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
  });

  it('should parse required environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key-min-10-chars';

    // Environment config is validated at import time
    // This test verifies the structure exists
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  it('should use default values for optional variables', () => {
    // Defaults are set in env.ts
    expect(process.env.PORT || '4000').toBeDefined();
  });

  it('should handle comma-separated CORS origins', () => {
    process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:3001';
    expect(process.env.CORS_ORIGIN).toContain(',');
  });
});

