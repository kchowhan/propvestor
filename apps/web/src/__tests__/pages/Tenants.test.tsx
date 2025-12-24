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

describe('TenantsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tenants tab by default', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]); // Tenants

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });
  });

  it('should filter active tenants in Tenants tab', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'ACTIVE', leases: [] },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'PROSPECT', leases: [] },
      ]);

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('should show prospects in Prospects tab', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'ACTIVE', leases: [] },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'PROSPECT', leases: [] },
      ]);

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should create new prospect', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]) // Tenants
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    renderWithProviders(<TenantsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tenants')).toBeInTheDocument();
    });

    const prospectsTab = screen.getByText(/prospects/i);
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      const firstNameLabel = screen.getByText('First Name');
      expect(firstNameLabel).toBeInTheDocument();
    });

    // Use querySelector to find inputs by their labels' text content
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
});

