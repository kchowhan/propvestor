import { renderHook, waitFor, act } from '@testing-library/react';
import { vi } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { HomeownerAuthProvider, useHomeownerAuth } from '../../context/HomeownerAuthContext';
import { apiFetch } from '../../api/client';

jest.mock('../../api/client', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <HomeownerAuthProvider>{children}</HomeownerAuthProvider>
    </QueryClientProvider>
  );
};

// Import shared localStorage mock
import { localStorageMock } from '../setup/localStorage-mock';

const localStorageStore = localStorageMock._store;

describe('HomeownerAuthContext', () => {
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
    localStorageStore['has_ho_session'] = 'true';
    // Verify it's set and accessible through the mock
    expect(localStorageStore['has_ho_session']).toBe('true');
    const retrieved = window.localStorage.getItem('has_ho_session');
    expect(retrieved).toBe('true');
    // Clear API mocks and reset implementation
    mockApiFetch.mockClear();
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    // Clean up store
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  });

  it('should initialize with no session', async () => {
    // For this test, simulate no session hint (no localStorage)
    localStorageMock.removeItem('has_ho_session');
    mockApiFetch.mockRejectedValueOnce(new Error('Unauthorized'));
    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.homeowner).toBeNull();
    expect(result.current.association).toBeNull();
  });

  it('should login successfully', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /homeowner-auth/me (initial session load) - fails with 401
    // Second call: /homeowner-auth/login (actual login) - succeeds (no /auth/me needed)
    const mockResponse = {
      homeowner: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        emailVerified: true,
        status: 'ACTIVE',
        accountBalance: 0,
      },
      association: {
        id: '1',
        name: 'Test HOA',
      },
    };

    const unauthorizedError = new Error('Unauthorized');
    (unauthorizedError as any).errorData = { error: { code: 'UNAUTHORIZED' } };
    mockApiFetch
      .mockRejectedValueOnce(unauthorizedError) // Initial session load fails
      .mockResolvedValue(mockResponse); // Login succeeds (homeowner login doesn't call /auth/me)

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    // Wait for initial session load to complete (will fail with 401)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.token).toBeNull(); // No token after failed session load
    });

    await act(async () => {
      await result.current.login('john@example.com', 'password123');
    });

    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
      expect(result.current.homeowner?.email).toBe('john@example.com');
      expect(result.current.association?.name).toBe('Test HOA');
    });
  });

  it('should handle login error', async () => {
    // Session hint should already be set by beforeEach
    mockApiFetch
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockRejectedValue(new Error('Invalid email or password.'));

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      act(async () => {
        await result.current.login('john@example.com', 'wrongpassword');
      })
    ).rejects.toThrow();
  });

  it('should register successfully', async () => {
    // Session hint should already be set by beforeEach
    const mockResponse = {
      message: 'Registration successful',
      homeowner: {
        id: '1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        emailVerified: false,
      },
    };

    mockApiFetch
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.register({
        associationId: '1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'password123',
      });
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/homeowner-auth/register', {
      method: 'POST',
      body: expect.objectContaining({
        associationId: '1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        password: 'password123',
      }),
    });
  });

  it('should logout and clear token', async () => {
    // Session hint is set by beforeEach, so component will try to load session first
    // First call: /homeowner-auth/me (initial session load) - fails with 401
    // Second call: /homeowner-auth/login (login to set up state) - succeeds
    // Third call: /homeowner-auth/logout (logout) - succeeds
    const unauthorizedError = new Error('Unauthorized');
    (unauthorizedError as any).errorData = { error: { code: 'UNAUTHORIZED' } };
    const mockResponse = {
      homeowner: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        emailVerified: true,
        status: 'ACTIVE',
        accountBalance: 0,
      },
      association: { id: '1', name: 'Test HOA' },
    };
    mockApiFetch
      .mockRejectedValueOnce(unauthorizedError) // Initial session load fails
      .mockResolvedValueOnce(mockResponse) // Login succeeds
      .mockResolvedValueOnce({}); // Logout API call succeeds

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    // Wait for initial session load to complete (will fail with 401)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.token).toBeNull(); // No token after failed session load
    });

    // Login to set up logged-in state
    await act(async () => {
      await result.current.login('john@example.com', 'password123');
    });

    // Verify we're logged in
    await waitFor(() => {
      expect(result.current.token).toBe('cookie');
      expect(result.current.homeowner).toBeDefined();
    });

    // Now logout
    act(() => {
      result.current.logout();
    });

    // Wait for logout to complete
    await waitFor(() => {
      expect(result.current.token).toBeNull();
      expect(result.current.homeowner).toBeNull();
      expect(result.current.association).toBeNull();
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/homeowner-auth/logout', { method: 'POST' });
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('has_ho_session');
  });

  it('should refresh data', async () => {
    // Session hint should already be set by beforeEach
    mockApiFetch.mockResolvedValue({
      homeowner: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        emailVerified: true,
        status: 'ACTIVE',
        accountBalance: 100,
      },
      association: { id: '1', name: 'Test HOA' },
    });

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshData();
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/homeowner-auth/me');
  });
});
