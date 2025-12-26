import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn() as any;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api';
  });

  it('should make GET request successfully', async () => {
    const { apiFetch } = await import('../../api/client');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: '1', name: 'Test' } }),
    });

    const result = await apiFetch('/test', {});
    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/test',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      })
    );
  });

  it('should make POST request with body', async () => {
    const { apiFetch } = await import('../../api/client');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { success: true } }),
    });

    await apiFetch('/test', {
      method: 'POST',
      body: { name: 'Test' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
        credentials: 'include',
      })
    );
  });

  it('should include Authorization header with token', async () => {
    const { apiFetch } = await import('../../api/client');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    });

    await apiFetch('/test', { token: 'test-token' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('should skip Authorization header for cookie sessions', async () => {
    const { apiFetch } = await import('../../api/client');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    });

    await apiFetch('/test', { token: 'cookie' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/test',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('should handle API errors', async () => {
    const { apiFetch } = await import('../../api/client');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      }),
    });

    await expect(apiFetch('/test', {})).rejects.toThrow('Resource not found');
  });

  it('should handle network errors', async () => {
    const { apiFetch } = await import('../../api/client');
    
    (global.fetch as any).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );

    await expect(apiFetch('/test', {})).rejects.toThrow(
      'Unable to connect to server'
    );
  });

  it('should handle non-JSON error responses', async () => {
    const { apiFetch } = await import('../../api/client');
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(apiFetch('/test', {})).rejects.toThrow(
      'HTTP 500: Internal Server Error'
    );
  });
});
