import { screen } from '@testing-library/react';
import { Layout } from '../../components/Layout';
import { renderWithProviders } from '../../../jest.setup';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockAuth = {
  token: 'test-token',
  user: { id: '1', name: 'Test User', email: 'test@test.com' },
  organization: { id: 'org1', name: 'Test Org', slug: 'test-org' },
  organizations: [{ id: 'org1', name: 'Test Org', slug: 'test-org', role: 'OWNER' }],
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

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});

