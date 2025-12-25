import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../../components/Sidebar';
import { AuthProvider } from '../../context/AuthContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock AuthContext
const mockAuth = {
  token: 'test-token',
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  organization: { id: '1', name: 'Test Org', slug: 'test-org' },
  organizations: [],
  currentRole: 'OWNER',
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  switchOrganization: jest.fn(),
  createOrganization: jest.fn(),
  logout: jest.fn(),
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('Sidebar', () => {
  it('should render navigation items', () => {
    render(
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Tenants & Applicants')).toBeInTheDocument();
    expect(screen.getByText('Leases')).toBeInTheDocument();
  });

  it('should render dashboard link', () => {
    render(
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    );

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should render logo', () => {
    render(
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    );

    // Logo component should be rendered
    const logo = screen.getByAltText('PropVestor');
    expect(logo).toBeInTheDocument();
  });
});

