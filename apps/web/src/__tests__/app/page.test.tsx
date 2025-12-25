import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Home from '@/app/page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Home Page', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);
  });

  it('should show loading initially', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      loading: true,
      user: null,
      organization: null,
      organizations: [],
      currentRole: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      switchOrganization: jest.fn(),
      createOrganization: jest.fn(),
    } as any);

    render(<Home />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('should redirect to dashboard when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      token: 'test-token',
      loading: false,
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      organization: { id: '1', name: 'Test Org' },
      organizations: [],
      currentRole: 'OWNER',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      switchOrganization: jest.fn(),
      createOrganization: jest.fn(),
    } as any);

    render(<Home />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should redirect to login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      token: null,
      loading: false,
      user: null,
      organization: null,
      organizations: [],
      currentRole: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      switchOrganization: jest.fn(),
      createOrganization: jest.fn(),
    } as any);

    render(<Home />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('should not redirect while loading', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      loading: true,
      user: null,
      organization: null,
      organizations: [],
      currentRole: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      switchOrganization: jest.fn(),
      createOrganization: jest.fn(),
    } as any);

    render(<Home />);

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

