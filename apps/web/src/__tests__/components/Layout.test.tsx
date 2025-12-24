import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Layout } from '../../components/Layout';
import { renderWithProviders } from '../../../jest.setup';

const mockReplace = jest.fn();
const mockRouter = {
  push: jest.fn(),
  replace: mockReplace,
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockSwitchOrganization = jest.fn();
const mockCreateOrganization = jest.fn();
const mockLogout = jest.fn();

const mockAuth = {
  token: 'test-token',
  user: { id: '1', name: 'Test User', email: 'test@test.com', isSuperAdmin: false },
  organization: { id: 'org1', name: 'Test Org', slug: 'test-org' },
  organizations: [{ id: 'org1', name: 'Test Org', slug: 'test-org', role: 'OWNER' }],
  currentRole: 'OWNER',
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  switchOrganization: mockSwitchOrganization,
  createOrganization: mockCreateOrganization,
  logout: mockLogout,
};

let currentMockAuth = { ...mockAuth };

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => currentMockAuth,
}));

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentMockAuth = { ...mockAuth, user: { ...mockAuth.user, isSuperAdmin: false } };
    mockApiFetch.mockResolvedValue({ data: [] });
    mockSwitchOrganization.mockResolvedValue('new-token');
    delete (window as any).location;
    (window as any).location = { reload: jest.fn() };
    Storage.prototype.getItem = jest.fn(() => 'test-token');
    Storage.prototype.setItem = jest.fn();
  });

  it('should render children', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should display organization name', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    expect(screen.getByText('Test Org')).toBeInTheDocument();
  });

  it('should display user name', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should show PropVestor logo/title', () => {
    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    expect(screen.getByText('PropVestor')).toBeInTheDocument();
  });

  it('should show organization dropdown when user has multiple organizations', () => {
    currentMockAuth = {
      ...mockAuth,
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'MANAGER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Test Org/i });
    expect(orgButton).toBeInTheDocument();
  });

  it('should open organization dropdown on click', async () => {
    currentMockAuth = {
      ...mockAuth,
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'MANAGER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Test Org/i });
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText('Org 1')).toBeInTheDocument();
      expect(screen.getByText('Org 2')).toBeInTheDocument();
    });
  });

  it('should switch organization when different org is selected', async () => {
    currentMockAuth = {
      ...mockAuth,
      organization: { id: 'org1', name: 'Org 1', slug: 'org-1' },
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'MANAGER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    // Open dropdown
    const orgButton = screen.getByRole('button', { name: /Org 1/i });
    fireEvent.click(orgButton);

    // Click on Org 2
    await waitFor(() => {
      const org2Button = screen.getByText('Org 2');
      fireEvent.click(org2Button);
    });

    await waitFor(() => {
      expect(mockSwitchOrganization).toHaveBeenCalledWith('org2');
    });
  });

  it('should show "Create Organization" option for OWNER users', async () => {
    currentMockAuth = {
      ...mockAuth,
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'OWNER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Test Org/i });
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.getByText('+ Create Organization')).toBeInTheDocument();
    });
  });

  it('should not show "Create Organization" for non-OWNER users', async () => {
    currentMockAuth = {
      ...mockAuth,
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'MANAGER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'VIEWER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Test Org/i });
    fireEvent.click(orgButton);

    await waitFor(() => {
      expect(screen.queryByText('+ Create Organization')).not.toBeInTheDocument();
    });
  });

  it('should show create organization form when clicked', async () => {
    currentMockAuth = {
      ...mockAuth,
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'OWNER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Test Org/i });
    fireEvent.click(orgButton);

    await waitFor(() => {
      const createButton = screen.getByText('+ Create Organization');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Organization name')).toBeInTheDocument();
    });
  });

  it('should create organization when form is submitted', async () => {
    mockCreateOrganization.mockResolvedValue(undefined);
    currentMockAuth = {
      ...mockAuth,
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'OWNER' },
      ],
    };

    // Mock alert
    global.alert = jest.fn();

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Test Org/i });
    fireEvent.click(orgButton);

    await waitFor(() => {
      const createButton = screen.getByText('+ Create Organization');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Organization name');
      fireEvent.change(input, { target: { value: 'New Org' } });
    });

    const form = screen.getByPlaceholderText('Organization name').closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalledWith('New Org');
    });
  });

  describe('Super Admin Features', () => {
    it('should fetch all organizations for super admin', async () => {
      const allOrgs = [
        { id: 'org1', name: 'Org 1', slug: 'org-1' },
        { id: 'org2', name: 'Org 2', slug: 'org-2' },
        { id: 'org3', name: 'Org 3', slug: 'org-3' },
      ];

      mockApiFetch.mockResolvedValue({ data: allOrgs });
      
      currentMockAuth = {
        ...mockAuth,
        user: { id: '1', name: 'Admin', email: 'admin@test.com', isSuperAdmin: true },
        organizations: [
          { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        ],
      };

      renderWithProviders(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/admin/organizations?limit=100',
          { token: 'test-token' }
        );
      });
    });

    it('should show "All Organizations" label for super admin', async () => {
      mockApiFetch.mockResolvedValue({
        data: [
          { id: 'org1', name: 'Org 1', slug: 'org-1' },
          { id: 'org2', name: 'Org 2', slug: 'org-2' },
        ],
      });

      currentMockAuth = {
        ...mockAuth,
        user: { id: '1', name: 'Admin', email: 'admin@test.com', isSuperAdmin: true },
        organization: { id: 'org1', name: 'Org 1', slug: 'org-1' },
        organizations: [
          { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        ],
      };

      renderWithProviders(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      const orgButton = screen.getByRole('button', { name: /Org 1/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('All Organizations')).toBeInTheDocument();
      });
    });

    it('should use impersonate endpoint for non-member organizations', async () => {
      mockApiFetch
        .mockResolvedValueOnce({
          data: [
            { id: 'org1', name: 'Org 1', slug: 'org-1' },
            { id: 'org2', name: 'Org 2', slug: 'org-2' },
          ],
        })
        .mockResolvedValueOnce({
          token: 'impersonate-token',
          user: { id: '1', name: 'Admin' },
          organization: { id: 'org2', name: 'Org 2' },
        });

      currentMockAuth = {
        ...mockAuth,
        user: { id: '1', name: 'Admin', email: 'admin@test.com', isSuperAdmin: true },
        organization: { id: 'org1', name: 'Org 1', slug: 'org-1' },
        organizations: [
          { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        ],
      };

      renderWithProviders(
        <Layout>
          <div>Test</div>
        </Layout>
      );

      await waitFor(() => {
        const orgButton = screen.getByRole('button', { name: /Org 1/i });
        fireEvent.click(orgButton);
      });

      await waitFor(() => {
        const org2Button = screen.getByText('Org 2');
        fireEvent.click(org2Button);
      });

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/admin/organizations/org2/impersonate',
          { token: 'test-token', method: 'POST' }
        );
      });
    });
  });

  it('should handle organization switch errors', async () => {
    mockSwitchOrganization.mockRejectedValue(new Error('Switch failed'));
    global.alert = jest.fn();

    currentMockAuth = {
      ...mockAuth,
      organization: { id: 'org1', name: 'Org 1', slug: 'org-1' },
      organizations: [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'OWNER' },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'MANAGER' },
      ],
    };

    renderWithProviders(
      <Layout>
        <div>Test</div>
      </Layout>
    );

    const orgButton = screen.getByRole('button', { name: /Org 1/i });
    fireEvent.click(orgButton);

    await waitFor(() => {
      const org2Button = screen.getByText('Org 2');
      fireEvent.click(org2Button);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Failed to switch organization')
      );
    });
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

