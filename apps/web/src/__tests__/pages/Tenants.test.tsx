import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TenantsPage } from '../../pages/Tenants';

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

    render(<TenantsPage />);

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

    render(<TenantsPage />);

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

    render(<TenantsPage />);

    const prospectsTab = screen.getByText('Prospects & Applicants');
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

    render(<TenantsPage />);

    const prospectsTab = screen.getByText('Prospects & Applicants');
    fireEvent.click(prospectsTab);

    await waitFor(() => {
      const firstNameInput = screen.getByPlaceholderText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'New' } });
    });

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

