import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeasesPage } from '../../pages/Leases';

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

describe('LeasesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create lease tab by default', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Leases
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]); // Tenants

    render(<LeasesPage />);

    await waitFor(() => {
      expect(screen.getByText('Create Lease')).toBeInTheDocument();
    });
  });

  it('should switch to leases tab', async () => {
    mockApiFetch
      .mockResolvedValueOnce([
        { id: '1', unit: { name: 'Unit 1' }, status: 'ACTIVE' },
      ])
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]); // Tenants

    render(<LeasesPage />);

    const leasesTab = screen.getByText('Leases');
    fireEvent.click(leasesTab);

    await waitFor(() => {
      expect(screen.getByText('Unit 1')).toBeInTheDocument();
    });
  });

  it('should create new lease', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Leases
      .mockResolvedValueOnce([
        { id: '1', name: 'Property 1', units: [{ id: '1', name: 'Unit 1' }] },
      ]) // Properties
      .mockResolvedValueOnce([
        { id: '1', firstName: 'John', lastName: 'Doe' },
      ]) // Tenants
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    render(<LeasesPage />);

    await waitFor(() => {
      const submitButton = screen.getByText('Create Lease');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/leases',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

