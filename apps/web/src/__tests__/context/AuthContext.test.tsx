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

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide auth context', () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should load session from cookies', async () => {
    mockApiFetch.mockResolvedValue({
      user: { id: '1', name: 'Test', email: 'test@example.com' },
      organization: { id: '1', name: 'Test Org', slug: 'test' },
      currentRole: 'OWNER',
      organizations: [],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
    });
  });

  it('should login successfully', async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        organizations: [],
      })
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [],
      });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
      expect(result.current.user).toBeDefined();
    });
  });

  it('should logout and clear token', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
  });

  it('should register successfully', async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
      });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

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
    });
  });

  it('should switch organization successfully', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'Other Org', slug: 'other', role: 'ADMIN' },
        ],
      })
      .mockResolvedValueOnce({
        organization: { id: '2', name: 'Other Org', slug: 'other' },
      })
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '2', name: 'Other Org', slug: 'other' },
        currentRole: 'ADMIN',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'Other Org', slug: 'other', role: 'ADMIN' },
        ],
      });

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
    mockApiFetch
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [{ id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' }],
      })
      .mockResolvedValueOnce({
        id: '2',
        name: 'New Org',
        slug: 'new-org',
      })
      .mockResolvedValueOnce({
        user: { id: '1', name: 'Test', email: 'test@example.com' },
        organization: { id: '1', name: 'Test Org', slug: 'test' },
        currentRole: 'OWNER',
        organizations: [
          { id: '1', name: 'Test Org', slug: 'test', role: 'OWNER' },
          { id: '2', name: 'New Org', slug: 'new-org', role: 'OWNER' },
        ],
      });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
    });

    await act(async () => {
      await result.current.createOrganization('New Org');
    });

    await waitFor(() => {
      expect(result.current.organizations.length).toBeGreaterThan(1);
    });
  });
});
