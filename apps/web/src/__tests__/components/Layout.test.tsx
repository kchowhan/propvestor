import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { Layout } from '../../components/Layout';

const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

const mockPathname = jest.fn(() => '/dashboard');
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname(),
}));

const mockSwitchOrganization = jest.fn();
const mockLogout = jest.fn();
const mockCreateOrganization = jest.fn();

const mockAuth = {
  user: { id: '1', name: 'Test User', isSuperAdmin: false },
  organization: { id: '1', name: 'Test Organization' },
  organizations: [{ id: '1', name: 'Test Organization', role: 'OWNER' }],
  switchOrganization: mockSwitchOrganization,
  logout: mockLogout,
  createOrganization: mockCreateOrganization,
  token: 'test-token',
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.location.reload
    delete (window as any).location;
    (window as any).location = { reload: jest.fn() };
  });

  it('should render children', () => {
    const { container } = renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );

    expect(container.querySelector('[data-testid="test-content"]')).toBeInTheDocument();
  });

  it('should call logout when logout button is clicked', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

});
