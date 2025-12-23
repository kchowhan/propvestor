import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingPage } from '../../pages/Billing';

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

describe('BillingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render rent roll', async () => {
    mockApiFetch.mockResolvedValue([
      {
        chargeId: '1',
        property: { name: 'Property 1' },
        unit: { name: 'Unit 1' },
        tenants: [{ firstName: 'John' }],
        rentAmount: 1000,
        amountPaid: 1000,
        balance: 0,
      },
    ]);

    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
    });
  });

  it('should generate monthly rent', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Initial rent roll
      .mockResolvedValueOnce({ totalCreated: 5 }); // Generate

    render(<BillingPage />);

    const generateButton = screen.getByText('Generate monthly rent');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/billing/generate-monthly-rent',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should show empty state when no charges', async () => {
    mockApiFetch.mockResolvedValue([]);

    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText(/No rent charges found/)).toBeInTheDocument();
    });
  });
});

