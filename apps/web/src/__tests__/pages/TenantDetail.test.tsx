import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TenantDetailPage } from '../../components/pages/TenantDetail';

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
  useParams: () => ({ id: 'tenant-1' }),
}));

jest.mock('../../components/AddPaymentMethodModal', () => ({
  AddPaymentMethodModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div>Payment Method Modal</div> : null
  ),
}));

describe('TenantDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tenant details', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'tenant-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce([]) // Screening requests
      .mockResolvedValueOnce([]) // Payment methods
      .mockResolvedValueOnce([]); // Payments

    render(<TenantDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should switch between tabs', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'tenant-1',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
      })
      .mockResolvedValueOnce([]) // Screening
      .mockResolvedValueOnce([]) // Payment methods
      .mockResolvedValueOnce([]); // Payments

    render(<TenantDetailPage />);

    const screeningTab = screen.getByText('Screening');
    fireEvent.click(screeningTab);

    await waitFor(() => {
      expect(screen.getByText('Screening')).toBeInTheDocument();
    });
  });
});

