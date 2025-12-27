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

// Setup localStorage mock before tests - use a shared store to avoid conflicts
if (!(window as any).__localStorageStore) {
  (window as any).__localStorageStore = {};
}
const localStorageStore: Record<string, string> = (window as any).__localStorageStore;

const localStorageMock = {
  getItem: jest.fn((key: string) => localStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageStore[key] = value.toString();
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  }),
};

// Only define if not already defined to avoid conflicts
if (!window.localStorage || !(window.localStorage as any).__isMock) {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  (localStorageMock as any).__isMock = true;
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear the store first
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
    // Re-set mock implementations (don't use clearAllMocks as it breaks the implementations)
    localStorageMock.getItem.mockImplementation((key: string) => localStorageStore[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      localStorageStore[key] = value.toString();
    });
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete localStorageStore[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
    });
    // Set default session hint for most tests
    localStorageMock.setItem('has_pm_session', 'true');
    // Clear API mocks
    mockApiFetch.mockClear();
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

  it('should load session from cookies', async () => {
    // Session hint should already be set by beforeEach
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
    // Session hint should already be set by beforeEach
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
    // Session hint should already be set by beforeEach
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
    // Session hint should already be set by beforeEach
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
    // Session hint should already be set by beforeEach
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
