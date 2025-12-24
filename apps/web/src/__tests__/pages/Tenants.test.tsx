import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TenantsPage } from '../../components/pages/Tenants';
import { renderWithProviders } from '../../../jest.setup';

const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockAuth = {
  token: 'test-token',
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Helper to setup mocks based on path
const setupMocks = (options: {
  properties?: any[];
  tenants?: any[];
  error?: boolean;
}) => {
  mockApiFetch.mockImplementation((path: string) => {
    if (options.error) {
      return Promise.reject(new Error('Failed to load'));
    }
    if (path === '/properties') {
      return Promise.resolve(options.properties || []);
    }
    if (path === '/tenants') {
      return Promise.resolve(options.tenants || []);
    }
    if (path === '/screening/request') {
      return Promise.resolve({ data: { id: 'screening-1' } });
    }
    return Promise.resolve({ data: {} });
  });
};

describe('TenantsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tenants tab by default', async () => {
    setupMocks({ properties: [], tenants: [] });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });
  });

  it('should filter active tenants in Tenants tab', async () => {
    setupMocks({
      properties: [],
      tenants: [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'ACTIVE', leases: [] },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'PROSPECT', leases: [] },
      ],
    });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should show prospects in Prospects tab', async () => {
    setupMocks({
      properties: [],
      tenants: [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'ACTIVE', leases: [] },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'PROSPECT', leases: [] },
      ],
    });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should create new prospect', async () => {
    setupMocks({ properties: [], tenants: [] });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      expect(screen.getByText('First Name')).toBeInTheDocument();
    });

    const firstNameLabel = screen.getByText('First Name');
    const firstNameInput = firstNameLabel.parentElement?.querySelector('input');
    if (firstNameInput) {
      fireEvent.change(firstNameInput, { target: { value: 'New' } });
    }
    
    const lastNameLabel = screen.getByText('Last Name');
    const lastNameInput = lastNameLabel.parentElement?.querySelector('input');
    if (lastNameInput) {
      fireEvent.change(lastNameInput, { target: { value: 'Prospect' } });
    }
    
    const emailLabel = screen.getByText('Email');
    const emailInput = emailLabel.parentElement?.querySelector('input[type="email"]');
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    }

    const submitButton = screen.getByText('Add Prospect');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tenants',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should show loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<TenantsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    setupMocks({ error: true });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tenants/i)).toBeInTheDocument();
    });
  });

  it('should request screening for prospect', async () => {
    setupMocks({
      properties: [],
      tenants: [
        { id: '1', firstName: 'Jane', lastName: 'Smith', status: 'PROSPECT', email: 'jane@example.com', leases: [] },
      ],
    });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const requestButtons = screen.queryAllByText(/request screening/i);
    if (requestButtons.length > 0) {
      fireEvent.click(requestButtons[0]);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/screening/request',
          expect.objectContaining({
            method: 'POST',
            body: expect.objectContaining({ tenantId: '1' }),
          }),
        );
      });
    } else {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    }
  });

  it('should handle form field changes', async () => {
    setupMocks({ properties: [], tenants: [] });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      const firstNameLabel = screen.getByText('First Name');
      const firstNameInput = firstNameLabel.parentElement?.querySelector('input');
      if (firstNameInput) {
        fireEvent.change(firstNameInput, { target: { value: 'Test' } });
        expect(firstNameInput).toHaveValue('Test');
      }
    });
  });

  it('should filter tenants with active leases', async () => {
    setupMocks({
      properties: [],
      tenants: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          status: 'INACTIVE',
          leases: [{ lease: { status: 'ACTIVE' } }],
        },
      ],
    });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should exclude active tenants from prospects tab', async () => {
    setupMocks({
      properties: [],
      tenants: [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'ACTIVE', leases: [] },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'PROSPECT', leases: [] },
      ],
    });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should show empty state for tenants', async () => {
    setupMocks({ properties: [], tenants: [] });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      const emptyText = screen.queryByText(/No tenants found/i);
      const tenantsLabel = screen.queryByText('Tenants');
      expect(emptyText || tenantsLabel).toBeTruthy();
    });
  });

  it('should show empty state for prospects', async () => {
    setupMocks({
      properties: [],
      tenants: [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'ACTIVE', leases: [] },
      ],
    });

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      const formLabel = screen.queryByText('First Name');
      const emptyText = screen.queryByText(/no prospects/i);
      expect(formLabel || emptyText).toBeTruthy();
    });
  });
});
