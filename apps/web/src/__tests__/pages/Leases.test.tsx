import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { LeasesPage } from '../../components/pages/Leases';
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

describe('LeasesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create lease tab by default', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Leases
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]); // Tenants

    renderWithProviders(<LeasesPage />);

    await waitFor(() => {
      // Wait for loading to complete
      expect(screen.queryByText('Loading leases...')).not.toBeInTheDocument();
    });

    // Check for the tab button (not the header)
    const createTab = screen.getAllByText('Create Lease')[0];
    expect(createTab).toBeInTheDocument();
  });

  it('should switch to leases tab', async () => {
    mockApiFetch
      .mockResolvedValueOnce([
        { id: '1', unit: { name: 'Unit 1' }, status: 'ACTIVE' },
      ])
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]); // Tenants

    renderWithProviders(<LeasesPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading leases...')).not.toBeInTheDocument();
    });

    const leasesTab = screen.getAllByText('Leases').find(btn => btn.tagName === 'BUTTON');
    if (leasesTab) {
      fireEvent.click(leasesTab);
    }

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

    renderWithProviders(<LeasesPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading leases...')).not.toBeInTheDocument();
    });

    // Fill in required fields - use select for unit
    await waitFor(() => {
      const unitSelect = screen.getByDisplayValue('Select unit');
      fireEvent.change(unitSelect, { target: { value: '1' } });
    });
    
    const dateInputs = screen.getAllByDisplayValue('').filter((input: any) => input.type === 'date');
    if (dateInputs.length >= 2) {
      fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } });
      fireEvent.change(dateInputs[1], { target: { value: '2024-12-31' } });
    }
    
    const rentInput = screen.getByPlaceholderText('Rent amount');
    fireEvent.change(rentInput, { target: { value: '1000' } });
    
    const rentDueInput = screen.getByPlaceholderText('Rent due day');
    fireEvent.change(rentDueInput, { target: { value: '1' } });

    const submitButton = screen.getAllByText('Create Lease').find((btn: any) => btn.type === 'submit' || btn.closest('form'));
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/leases',
        expect.objectContaining({
          method: 'POST',
        })
      );
    }, { timeout: 3000 });
  });
});

