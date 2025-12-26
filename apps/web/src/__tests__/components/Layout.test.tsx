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

  it('should open organization menu when organization name is clicked', () => {
    const mockAuthWithMultipleOrgs = {
      ...mockAuth,
      organizations: [
        { id: '1', name: 'Test Organization', role: 'OWNER' },
        { id: '2', name: 'Another Organization', role: 'MEMBER' },
      ],
    };

    jest.spyOn(require('../../context/AuthContext'), 'useAuth').mockReturnValue(mockAuthWithMultipleOrgs);

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Organization');
    fireEvent.click(orgButton);

    expect(screen.getByText('Another Organization')).toBeInTheDocument();
  });

  it('should switch organization when organization is selected', async () => {
    const mockAuthWithMultipleOrgs = {
      ...mockAuth,
      organizations: [
        { id: '1', name: 'Test Organization', role: 'OWNER' },
        { id: '2', name: 'Another Organization', role: 'MEMBER' },
      ],
    };

    jest.spyOn(require('../../context/AuthContext'), 'useAuth').mockReturnValue(mockAuthWithMultipleOrgs);

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Organization');
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByText('Another Organization')).toBeInTheDocument();
    });

    const anotherOrgButton = screen.getByText('Another Organization');
    fireEvent.click(anotherOrgButton);

    await waitFor(() => {
      expect(mockSwitchOrganization).toHaveBeenCalledWith('2');
    });
  });

  it('should show create organization form when button is clicked', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Organization');
    fireEvent.click(orgButton);

    const createButton = screen.getByText('+ Create New Organization');
    fireEvent.click(createButton);

    expect(screen.getByPlaceholderText('Organization name')).toBeInTheDocument();
  });

  it('should create organization when form is submitted', async () => {
    mockCreateOrganization.mockResolvedValue({ id: '2', name: 'New Organization' });

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Organization');
    fireEvent.click(orgButton);

    const createButton = screen.getByText('+ Create New Organization');
    fireEvent.click(createButton);

    const input = screen.getByPlaceholderText('Organization name');
    fireEvent.change(input, { target: { value: 'New Organization' } });

    const submitButton = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith('New Organization');
    });
  });

  it('should handle organization switch error', async () => {
    const mockAuthWithMultipleOrgs = {
      ...mockAuth,
      organizations: [
        { id: '1', name: 'Test Organization', role: 'OWNER' },
        { id: '2', name: 'Another Organization', role: 'MEMBER' },
      ],
    };

    jest.spyOn(require('../../context/AuthContext'), 'useAuth').mockReturnValue(mockAuthWithMultipleOrgs);
    mockSwitchOrganization.mockRejectedValue(new Error('Failed to switch'));

    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Organization');
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByText('Another Organization')).toBeInTheDocument();
    });

    const anotherOrgButton = screen.getByText('Another Organization');
    fireEvent.click(anotherOrgButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to switch organization'));
    });

    alertSpy.mockRestore();
  });

  it('should not show organization menu when user has only one organization', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    // Should just show organization name, not a button
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.queryByText('+ Create New Organization')).not.toBeInTheDocument();
  });
});
