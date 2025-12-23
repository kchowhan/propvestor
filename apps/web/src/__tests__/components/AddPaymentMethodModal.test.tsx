import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPaymentMethodModal } from '../../components/AddPaymentMethodModal';

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
    render(
      <AddPaymentMethodModal
        tenantId="tenant-123"
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
    });
  });

  it('should not render when closed', () => {
    render(
      <AddPaymentMethodModal
        tenantId="tenant-123"
        isOpen={false}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(screen.queryByText('Add Payment Method')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', async () => {
    const onClose = jest.fn();
    render(
      <AddPaymentMethodModal
        tenantId="tenant-123"
        isOpen={true}
        onClose={onClose}
        onSuccess={jest.fn()}
      />
    );

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

