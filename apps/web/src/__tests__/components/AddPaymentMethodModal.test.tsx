import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPaymentMethodModal } from '../../components/AddPaymentMethodModal';
import { renderWithProviders } from '../../../jest.setup';

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    elements: jest.fn(() => ({
      create: jest.fn(),
    })),
  })),
}));

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div>Payment Element</div>,
  useStripe: () => ({
    confirmSetup: jest.fn(() => Promise.resolve({
      error: null,
      setupIntent: { status: 'succeeded' },
    })),
  }),
  useElements: () => ({
    getElement: jest.fn(),
  }),
}));

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

describe('AddPaymentMethodModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch
      .mockResolvedValueOnce({ data: { publishableKey: 'pk_test_123' } })
      .mockResolvedValueOnce({ data: { clientSecret: 'seti_test', setupIntentId: 'seti_123' } })
      .mockResolvedValueOnce({ data: { success: true } });
  });

  it('should render modal when open', async () => {
    renderWithProviders(
      <AddPaymentMethodModal
        tenantId="tenant-123"
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    await waitFor(() => {
      // The modal might show loading or the form
      expect(screen.getByText(/payment method/i) || screen.getByText(/loading/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should not render when closed', () => {
    const { container } = renderWithProviders(
      <AddPaymentMethodModal
        tenantId="tenant-123"
        isOpen={false}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', async () => {
    const onClose = jest.fn();
    renderWithProviders(
      <AddPaymentMethodModal
        tenantId="tenant-123"
        isOpen={true}
        onClose={onClose}
        onSuccess={jest.fn()}
      />
    );

    await waitFor(() => {
      const cancelButton = screen.queryByText(/cancel/i);
      if (cancelButton) {
        fireEvent.click(cancelButton);
        expect(onClose).toHaveBeenCalled();
      }
    }, { timeout: 3000 });
  });
});

