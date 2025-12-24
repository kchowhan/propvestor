import React from 'react';
import {  screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { LeaseDetailPage } from '../../components/pages/LeaseDetail';

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

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'lease-1' }),
}));

describe('LeaseDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render lease details', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'lease-1',
      unit: { name: 'Unit 1', property: { name: 'Property 1' } },
      status: 'ACTIVE',
      rentAmount: 1000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      tenants: [],
      charges: [],
      payments: [],
    });

    renderWithProviders(<LeaseDetailPage />);

    await waitFor(() => {
      // The property name appears in the format "Property 1 - Unit 1"
      expect(screen.getByText(/Property 1.*Unit 1/)).toBeInTheDocument();
    });
  });

  it('should activate draft lease', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'lease-1',
        status: 'DRAFT',
        unit: { name: 'Unit 1', property: { name: 'Property 1' } },
        tenants: [],
        charges: [],
        payments: [],
      })
      .mockResolvedValueOnce({ data: { status: 'ACTIVE' } });

    renderWithProviders(<LeaseDetailPage />);

    await waitFor(() => {
      const activateButton = screen.getByText('Activate Lease');
      fireEvent.click(activateButton);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/leases/lease-1/activate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should generate rent charge', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'lease-1',
        status: 'ACTIVE',
        unit: { name: 'Unit 1', property: { name: 'Property 1' } },
        tenants: [],
        charges: [],
        payments: [],
      })
      .mockResolvedValueOnce({ data: { id: 'charge-1' } });

    renderWithProviders(<LeaseDetailPage />);

    await waitFor(() => {
      const generateButton = screen.getByText('Generate Rent Charge');
      fireEvent.click(generateButton);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/leases/lease-1/generate-rent-charge',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

