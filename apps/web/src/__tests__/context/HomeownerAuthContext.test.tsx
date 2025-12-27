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

describe('HomeownerAuthContext', () => {
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
    localStorageMock.setItem('has_ho_session', 'true');
    // Clear API mocks
    mockApiFetch.mockClear();
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

  it('should load session from cookies', async () => {
    // Session hint should already be set by beforeEach
    mockApiFetch.mockResolvedValue({
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
    });

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.token).toBe('cookie');
  });

  it('should login successfully', async () => {
    // Session hint should already be set by beforeEach
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
      await result.current.login('john@example.com', 'password123');
    });

    expect(result.current.token).toBe('cookie');
    expect(result.current.homeowner?.email).toBe('john@example.com');
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
    // Session hint should already be set by beforeEach
    mockApiFetch.mockResolvedValueOnce({
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
    });

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.homeowner).toBeNull();
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
