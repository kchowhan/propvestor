import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Layout } from '../../components/Layout';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(() => Promise.resolve()),
  }),
}));

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
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show organization name', () => {
    render(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    expect(screen.getByText('Test Org')).toBeInTheDocument();
  });

  it('should show organization switcher when multiple orgs', () => {
    render(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByText('Test Org');
    expect(orgButton).toBeInTheDocument();
  });

  it('should open organization menu on click', async () => {
    render(
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
});

