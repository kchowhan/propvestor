import React from 'react';
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
    localStorage.clear();
  });

  it('should provide auth context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should load token from localStorage', async () => {
    localStorage.setItem('propvestor_token', 'test-token');
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
      expect(result.current.token).toBe('test-token');
    });
  });

  it('should login successfully', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        token: 'new-token',
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
      expect(result.current.token).toBe('new-token');
      expect(result.current.user).toBeDefined();
    });
  });

  it('should logout and clear token', async () => {
    localStorage.setItem('propvestor_token', 'test-token');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('propvestor_token')).toBeNull();
  });
});

