import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <HomeownerAuthProvider>{children}</HomeownerAuthProvider>
    </QueryClientProvider>
  );
};

describe('HomeownerAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with no token', async () => {
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

  it('should load token from localStorage', async () => {
    const token = 'test-token';
    localStorage.setItem('propvestor_homeowner_token', token);

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

    expect(result.current.token).toBe(token);
  });

  it('should login successfully', async () => {
    const mockResponse = {
      token: 'new-token',
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

    mockApiFetch.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useHomeownerAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.login('john@example.com', 'password123');
    });

    expect(result.current.token).toBe('new-token');
    expect(result.current.homeowner?.email).toBe('john@example.com');
    expect(localStorage.getItem('propvestor_homeowner_token')).toBe('new-token');
  });

  it('should handle login error', async () => {
    mockApiFetch.mockRejectedValue(new Error('Invalid credentials'));

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
    ).rejects.toThrow('Invalid credentials');
  });

  it('should register successfully', async () => {
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

    mockApiFetch.mockResolvedValue(mockResponse);

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
    const token = 'test-token';
    localStorage.setItem('propvestor_homeowner_token', token);

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
    expect(localStorage.getItem('propvestor_homeowner_token')).toBeNull();
  });

  it('should refresh data', async () => {
    const token = 'test-token';
    localStorage.setItem('propvestor_homeowner_token', token);

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

    expect(mockApiFetch).toHaveBeenCalledWith('/homeowner-auth/me', {
      token: 'test-token',
    });
  });
});

