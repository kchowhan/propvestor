import React from 'react';
import { vi } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock apiFetch
const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Import shared localStorage mock
import { localStorageMock } from '../setup/localStorage-mock';

const localStorageStore = localStorageMock._store;

describe('AuthContext', () => {
  beforeEach(() => {
    // Ensure window.localStorage is our mock (redefine to ensure it's always our mock)
    
    // Ensure window.localStorage is our mock (redefine to ensure it's always our mock)
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    // Clear the store first
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
    // Don't reset mock implementations - they always read from store
    // Just clear call history
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    // Set default session hint for most tests - set directly in store
    localStorageStore['has_pm_session'] = 'true';
    // Verify it's set and accessible through the mock
    expect(localStorageStore['has_pm_session']).toBe('true');
    const retrieved = window.localStorage.getItem('has_pm_session');
    expect(retrieved).toBe('true');
    // Clear API mocks and reset implementation
    mockApiFetch.mockClear();
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    // Clean up store
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  });

  it('should provide auth context', () => {
    // For this test, simulate no session hint (no localStorage)
    localStorageMock.removeItem('has_pm_session');
    mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should login successfully', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /auth/me (initial session load) - fails with 401
    // Second call: /auth/login (actual login) - succeeds
    // Third call: /auth/me (get current role after login) - succeeds
    const unauthorizedError = new Error('Unauthorized');
    (unauthorizedError as any).errorData = { error: { code: 'UNAUTHORIZED' } };
    mockApiFetch
      .mockRejectedValueOnce(unauthorizedError) // Initial session load fails
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [],
      }) // Login succeeds
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [],
      }); // /auth/me call after login to get current role

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial session load to complete (will fail with 401)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.token).toBeNull(); // No token after failed session load
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
      expect(result.current.user).toBeDefined();
      expect(result.current.currentRole).toBe('OWNER');
    });
  });

  it('should logout and clear token', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /auth/me (initial session load) - fails with 401
    // Second call: /auth/logout (logout) - succeeds
    const unauthorizedError = new Error('Unauthorized');
    (unauthorizedError as any).errorData = { error: { code: 'UNAUTHORIZED' } };
    mockApiFetch
      .mockRejectedValueOnce(unauthorizedError) // Initial session load fails
      .mockResolvedValueOnce({}); // Logout API call succeeds

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial session load to complete (will fail with 401)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.token).toBeNull(); // No token after failed session load
    });

    act(() => {
      result.current.logout();
    });

    // Wait for logout to complete
    await waitFor(() => {
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.organization).toBeNull();
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('has_pm_session');
  });

  it('should register successfully', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /auth/me (initial session load) - fails with 401
    // Second call: /auth/register (actual registration) - succeeds (no /auth/me needed)
    const unauthorizedError = new Error('Unauthorized');
    (unauthorizedError as any).errorData = { error: { code: 'UNAUTHORIZED' } };
    mockApiFetch
      .mockRejectedValueOnce(unauthorizedError) // Initial session load fails
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
      }); // Registration succeeds (register doesn't call /auth/me)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial session load to complete (will fail with 401)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.token).toBeNull(); // No token after failed session load
    });

    await act(async () => {
      await result.current.register({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        organizationName: 'Test Org',
      });
    });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
      expect(result.current.user).toBeDefined();
      expect(result.current.organization).toBeDefined();
      expect(result.current.currentRole).toBe('OWNER');
    });
  });

  it('should switch organization successfully', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /auth/me (initial session load) - succeeds with first org
    // Second call: /organizations/{id}/switch (switch org) - succeeds
    // Third call: /auth/me (reload session with new org) - succeeds with second org
    mockApiFetch
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'Other Org', slug: 'other', role: 'ADMIN' },
        ],
      }) // Initial session load
      .mockResolvedValueOnce({
        organization: { id: '2', name: 'Other Org', slug: 'other' },
      }) // Switch organization
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '2', name: 'Other Org', slug: 'other' },
        currentRole: 'ADMIN',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'Other Org', slug: 'other', role: 'ADMIN' },
        ],
      }); // Reload session with new org

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
    });

    await act(async () => {
      const newToken = await result.current.switchOrganization('2');
      expect(newToken).toBe('cookie');
    });

    // Verify token was updated
    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
    });
  });

  it('should create organization successfully', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /auth/me (initial session load) - succeeds
    // Second call: /organizations (create org) - succeeds
    // Third call: /auth/me (reload organizations list) - succeeds
    // Fourth call: /auth/switch-organization (switch to new org) - succeeds
    // Fifth call: /auth/me (reload session with new org) - succeeds
    mockApiFetch
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [{ id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' }],
      }) // Initial session load
      .mockResolvedValueOnce({
        data: { id: '2', name: 'New Org', slug: 'new-org' },
      }) // Create organization (returns { data: { id, name, slug } })
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'New Org', slug: 'new-org', role: 'OWNER' },
        ],
      }) // /auth/me to reload organizations list
      .mockResolvedValueOnce({
        organization: { id: '2', name: 'New Org', slug: 'new-org' },
      }) // Switch organization
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '2', name: 'New Org', slug: 'new-org' },
        currentRole: 'OWNER',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'New Org', slug: 'new-org', role: 'OWNER' },
        ],
      }); // /auth/me after switch to reload session

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial session load to complete
    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.createOrganization('New Org');
    });

    await waitFor(() => {
      expect(result.current.organizations.length).toBeGreaterThan(1);
      expect(result.current.organization?.id).toBe('2');
      expect(result.current.organization?.name).toBe('New Org');
    });
  });
});
