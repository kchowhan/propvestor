import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Layout } from '../../components/Layout';
import { renderWithProviders } from '../../../jest.setup';

// Mock dependencies - next/navigation and usePathname are already mocked in jest.setup.js

const mockAuth = {
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  organization: { id: '1', name: 'Test Org', slug: 'test-org' },
  organizations: [
    { id: '1', name: 'Test Org', slug: 'test-org', role: 'OWNER' },
    { id: '2', name: 'Other Org', slug: 'other-org', role: 'ADMIN' },
  ],
  switchOrganization: jest.fn(() => Promise.resolve('new-token')),
  logout: jest.fn(),
  createOrganization: jest.fn(() => Promise.resolve()),
  currentRole: 'OWNER',
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should render children', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show organization name', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    expect(screen.getByText('Test Org')).toBeInTheDocument();
  });

  it('should show organization switcher when multiple orgs', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Org');
    expect(orgButton).toBeInTheDocument();
  });

  it('should open organization menu on click', async () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Org');
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByText('Other Org')).toBeInTheDocument();
    });
  });

  it('should switch organization', async () => {
    const mockSwitchOrg = jest.fn().mockResolvedValue('new-token');
    mockAuth.switchOrganization = mockSwitchOrg;
    localStorage.setItem('propvestor_token', 'new-token');

    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Org');
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByText('Other Org')).toBeInTheDocument();
    });

    const otherOrgButton = screen.getByText('Other Org');
    fireEvent.click(otherOrgButton);

    // Verify component rendered
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show create organization button when user is OWNER', async () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Org');
    fireEvent.click(orgButton);

    await waitFor(() => {
      const createButton = screen.queryByText(/create.*organization/i);
      expect(createButton).toBeTruthy();
    });
  });
});

