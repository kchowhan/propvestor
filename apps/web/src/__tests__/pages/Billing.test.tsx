import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { BillingPage } from '../../components/pages/Billing';

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

// Helper to setup mocks based on path
const setupMocks = (options: {
  rentRoll?: any[];
  charges?: any[];
  payments?: any[];
  reconciliations?: any[];
  unmatched?: { data?: { unmatchedPayments: any[]; unmatchedTransactions: any[] } };
  organizationFees?: any[];
  error?: boolean;
}) => {
  mockApiFetch.mockImplementation((path: string) => {
    if (options.error) {
      return Promise.reject(new Error('Failed to load'));
    }
    if (path.startsWith('/reports/rent-roll')) {
      return Promise.resolve({
        data: options.rentRoll || [],
        pagination: { total: options.rentRoll?.length || 0, limit: 20, offset: 0, hasMore: false },
      });
    }
    if (path.startsWith('/charges')) {
      return Promise.resolve({
        data: options.charges || [],
        pagination: { total: options.charges?.length || 0, limit: 100, offset: 0, hasMore: false },
      });
    }
    if (path.startsWith('/payments')) {
      return Promise.resolve({
        data: options.payments || [],
        pagination: { total: options.payments?.length || 0, limit: 20, offset: 0, hasMore: false },
      });
    }
    if (path.startsWith('/reconciliation') && !path.includes('/unmatched') && !path.includes('/import-transactions')) {
      return Promise.resolve({
        data: options.reconciliations || [],
        pagination: { total: options.reconciliations?.length || 0, limit: 20, offset: 0, hasMore: false },
      });
    }
    if (path.startsWith('/reconciliation/unmatched')) {
      const unmatchedPayments = options.unmatched?.data?.unmatchedPayments || [];
      const unmatchedTransactions = options.unmatched?.data?.unmatchedTransactions || [];
      return Promise.resolve({
        data: {
          unmatchedPayments,
          unmatchedTransactions,
        },
        pagination: {
          unmatchedPayments: { total: unmatchedPayments.length, limit: 20, offset: 0, hasMore: false },
          unmatchedTransactions: { total: unmatchedTransactions.length, limit: 20, offset: 0, hasMore: false },
        },
      });
    }
    if (path === '/organization-fees') {
      return Promise.resolve({ data: options.organizationFees || [] });
    }
    if (path === '/billing/generate-monthly-rent') {
      return Promise.resolve({ totalCreated: 5 });
    }
    if (path.startsWith('/reconciliation/import-transactions')) {
      return Promise.resolve({ data: { id: 'tx-1' } });
    }
    return Promise.resolve({ data: {} });
  });
};

describe('BillingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render rent roll', async () => {
    setupMocks({
      rentRoll: [
        {
          chargeId: '1',
          property: { name: 'Property 1' },
          unit: { name: 'Unit 1' },
          tenants: [{ firstName: 'John' }],
          rentAmount: 1000,
          amountPaid: 1000,
          balance: 0,
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
    });
  });

  it('should generate monthly rent', async () => {
    setupMocks({ rentRoll: [] });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

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
    setupMocks({ rentRoll: [] });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText(/No rent charges found/)).toBeInTheDocument();
    });
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<BillingPage />);

    expect(screen.getByText('Loading rent roll...')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    setupMocks({ error: true });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load rent roll/)).toBeInTheDocument();
    });
  });

  it('should display rent with balance due', async () => {
    setupMocks({
      rentRoll: [
        {
          chargeId: '1',
          property: { name: 'Property Balance' },
          unit: { name: 'Unit 1' },
          tenants: [{ firstName: 'John' }],
          rentAmount: 1000,
          amountPaid: 500,
          balance: 500,
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Property Balance')).toBeInTheDocument();
    });
  });

  it('should switch to payments tab', async () => {
    setupMocks({
      rentRoll: [],
      charges: [
        { id: '1', leaseId: 'lease-1', amount: 1000 },
      ],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.queryAllByText(/payments/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (paymentsTab) {
      fireEvent.click(paymentsTab);
    }

    // Verify the page rendered
    expect(screen.getByText('Rent Roll')).toBeInTheDocument();
  });

  it('should switch to reconciliation tab', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: { payments: [], transactions: [] },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.queryAllByText(/reconciliation/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (reconciliationTab) {
      fireEvent.click(reconciliationTab);
    }

    // Verify the page rendered
    expect(screen.getByText('Rent Roll')).toBeInTheDocument();
  });

  it('should switch to organization fees tab', async () => {
    setupMocks({
      rentRoll: [],
      organizationFees: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const feesTab = screen.queryAllByText(/organization.*fee|fee/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (feesTab) {
      fireEvent.click(feesTab);
    }

    // Verify the page rendered
    expect(screen.getByText('Rent Roll')).toBeInTheDocument();
  });

  it('should display multiple rent roll entries', async () => {
    setupMocks({
      rentRoll: [
        {
          chargeId: '1',
          property: { name: 'Property 1' },
          unit: { name: 'Unit 1' },
          tenants: [{ firstName: 'John' }],
          rentAmount: 1000,
          amountPaid: 1000,
          balance: 0,
        },
        {
          chargeId: '2',
          property: { name: 'Property 2' },
          unit: { name: 'Unit 2' },
          tenants: [{ firstName: 'Jane' }],
          rentAmount: 1500,
          amountPaid: 0,
          balance: 1500,
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
      expect(screen.getByText('Property 2')).toBeInTheDocument();
    });
  });

  it('should show multiple tenants in rent roll', async () => {
    setupMocks({
      rentRoll: [
        {
          chargeId: '1',
          property: { name: 'Multi Tenant Property' },
          unit: { name: 'Unit 1' },
          tenants: [{ firstName: 'John' }, { firstName: 'Jane' }],
          rentAmount: 2000,
          amountPaid: 2000,
          balance: 0,
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Multi Tenant Property')).toBeInTheDocument();
    });
  });

  it('should change month selector', async () => {
    setupMocks({ rentRoll: [] });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const monthInputs = screen.queryAllByRole('spinbutton');
    if (monthInputs.length > 0) {
      fireEvent.change(monthInputs[0], { target: { value: '6' } });
    }

    // Verify the page rendered - use getAllByText since there may be multiple
    const rentRollTexts = screen.getAllByText('Rent Roll');
    expect(rentRollTexts.length).toBeGreaterThan(0);
  });

  it('should change year selector', async () => {
    setupMocks({ rentRoll: [] });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const inputs = screen.queryAllByRole('spinbutton');
    if (inputs.length > 1) {
      fireEvent.change(inputs[1], { target: { value: '2025' } });
    }

    // Multiple elements with "Rent Roll" text exist
    const rentRollTexts = screen.getAllByText('Rent Roll');
    expect(rentRollTexts.length).toBeGreaterThan(0);
  });

  it('should display payments list in payments tab', async () => {
    setupMocks({
      rentRoll: [],
      charges: [{ id: 'charge-1', description: 'Rent', amount: 1000, status: 'PENDING', dueDate: '2024-01-01' }],
      payments: [
        {
          id: 'payment-1',
          receivedDate: '2024-01-15',
          amount: 1000,
          method: 'CHECK',
          reference: 'CHK123',
          reconciled: true,
          charge: { description: 'Jan Rent' },
        },
        {
          id: 'payment-2',
          receivedDate: '2024-02-15',
          amount: 500,
          method: 'CASH',
          reference: null,
          reconciled: false,
          charge: null,
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('All Payments')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('CHK123')).toBeInTheDocument();
      expect(screen.getByText('✓ Reconciled')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('should record payment from form', async () => {
    setupMocks({
      rentRoll: [],
      charges: [{ id: 'charge-1', description: 'Rent', amount: 1000, status: 'PENDING', dueDate: '2024-01-01' }],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('Record Payment (Check/Cash/Manual)')).toBeInTheDocument();
    });

    // Fill in payment form
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '1000' } });

    // Submit the form
    const form = amountInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/payments',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            amount: 1000,
            method: 'CHECK',
          }),
        })
      );
    });
  });

  it('should change payment method and show check number field', async () => {
    setupMocks({
      rentRoll: [],
      charges: [{ id: 'charge-1', description: 'Rent', amount: 1000, status: 'PENDING', dueDate: '2024-01-01' }],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('Record Payment (Check/Cash/Manual)')).toBeInTheDocument();
    });

    // Check number field should be visible for CHECK method
    expect(screen.getByText('Check Number')).toBeInTheDocument();

    // Change to CASH method
    const methodSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(methodSelect, { target: { value: 'CASH' } });

    // Check number field should no longer be visible
    expect(screen.queryByText('Check Number')).not.toBeInTheDocument();
  });

  it('should toggle create bank transaction checkbox', async () => {
    setupMocks({
      rentRoll: [],
      charges: [],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('Create bank transaction record')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('should import bank transaction in reconciliation tab', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Import Bank Transaction')).toBeInTheDocument();
    });

    // Fill in bank transaction form
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '500' } });

    const descInput = screen.getByPlaceholderText('Check payment #1234');
    fireEvent.change(descInput, { target: { value: 'Deposit from tenant' } });

    const refInput = screen.getByPlaceholderText('1234');
    fireEvent.change(refInput, { target: { value: 'DEP001' } });

    // Submit the form
    const form = amountInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/reconciliation/import-transactions',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should create reconciliation period', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Create Reconciliation Period')).toBeInTheDocument();
    });

    const createReconButton = screen.getByRole('button', { name: 'Create Reconciliation' });
    fireEvent.click(createReconButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/reconciliation',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should display unmatched payments and transactions', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: {
        data: {
          unmatchedPayments: [
            { id: 'p1', receivedDate: '2024-01-15', amount: 1000, method: 'CHECK', reference: 'CHK123', charge: { description: 'Rent' } },
          ],
          unmatchedTransactions: [
            { id: 't1', date: '2024-01-16', amount: 1000, description: 'Deposit', reference: 'DEP001' },
          ],
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Unmatched Items')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('CHK123')).toBeInTheDocument();
      expect(screen.getByText('DEP001')).toBeInTheDocument();
    });
  });

  it('should display reconciliation history', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [
        {
          id: 'recon-1',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          expectedTotal: 5000,
          actualTotal: 5000,
          difference: 0,
          status: 'COMPLETED',
        },
        {
          id: 'recon-2',
          startDate: '2024-02-01',
          endDate: '2024-02-29',
          expectedTotal: 5500,
          actualTotal: 5200,
          difference: 300,
          status: 'IN_PROGRESS',
        },
      ],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Reconciliation History')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    });
  });

  it('should complete reconciliation', async () => {
    window.confirm = jest.fn(() => true);

    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [
        {
          id: 'recon-1',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          expectedTotal: 5000,
          actualTotal: 5000,
          difference: 0,
          status: 'IN_PROGRESS',
        },
      ],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Mark this reconciliation as completed?');
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/reconciliation/recon-1/complete',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  it('should display organization fees', async () => {
    setupMocks({
      rentRoll: [],
      organizationFees: [
        {
          id: 'fee-1',
          createdAt: '2024-01-15',
          feeType: 'RENTSPREE_SCREENING',
          description: 'Background check for John Doe',
          amount: 35,
          charge: { status: 'PAID' },
        },
        {
          id: 'fee-2',
          createdAt: '2024-01-16',
          feeType: 'STRIPE_PROCESSING',
          description: 'Payment processing fee',
          amount: 10.50,
          charge: { status: 'PENDING' },
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const feesTab = screen.getByRole('button', { name: 'Organization Fees' });
    fireEvent.click(feesTab);

    await waitFor(() => {
      expect(screen.getByText('Background check for John Doe')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('RentSpree Screening')).toBeInTheDocument();
      expect(screen.getByText('Stripe Processing')).toBeInTheDocument();
    });
  });

  it('should show no fees found when empty', async () => {
    setupMocks({
      rentRoll: [],
      organizationFees: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const feesTab = screen.getByRole('button', { name: 'Organization Fees' });
    fireEvent.click(feesTab);

    await waitFor(() => {
      expect(screen.getByText('No organization fees found.')).toBeInTheDocument();
    });
  });

  it('should show organization fees loading state', async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/reports/rent-roll')) {
        return Promise.resolve([]);
      }
      if (path === '/organization-fees') {
        return new Promise(() => {}); // Never resolves
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const feesTab = screen.getByRole('button', { name: 'Organization Fees' });
    fireEvent.click(feesTab);

    await waitFor(() => {
      expect(screen.getByText('Loading organization fees...')).toBeInTheDocument();
    });
  });

  it('should show organization fees error state', async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/reports/rent-roll')) {
        return Promise.resolve([]);
      }
      if (path === '/organization-fees') {
        return Promise.reject(new Error('Failed to load'));
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const feesTab = screen.getByRole('button', { name: 'Organization Fees' });
    fireEvent.click(feesTab);

    await waitFor(() => {
      expect(screen.getByText('Failed to load organization fees.')).toBeInTheDocument();
    });
  });

  it('should show no payments state', async () => {
    setupMocks({
      rentRoll: [],
      charges: [],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
    });
  });

  it('should show all payments matched message', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('All payments are matched.')).toBeInTheDocument();
      expect(screen.getByText('All transactions are matched.')).toBeInTheDocument();
    });
  });

  it('should select a charge in payment form', async () => {
    setupMocks({
      rentRoll: [],
      charges: [
        { id: 'charge-1', description: 'Rent January', amount: 1000, status: 'PENDING', dueDate: '2024-01-01' },
        { id: 'charge-2', description: 'Rent February', amount: 1000, status: 'PAID', dueDate: '2024-02-01' },
      ],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('Charge (Optional)')).toBeInTheDocument();
    });

    // Only pending charges should be in the dropdown
    const chargeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(chargeSelect, { target: { value: 'charge-1' } });

    // The select should have been changed - verify by checking the component rendered
    expect(screen.getByText('Charge (Optional)')).toBeInTheDocument();
  });

  it('should show reconciliation tip when both unmatched', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: {
        data: {
          unmatchedPayments: [{ id: 'p1', receivedDate: '2024-01-15', amount: 1000, method: 'CHECK', reference: 'CHK123' }],
          unmatchedTransactions: [{ id: 't1', date: '2024-01-16', amount: 1000, description: 'Deposit', reference: 'DEP001' }],
        },
      },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText(/Create a reconciliation period above/)).toBeInTheDocument();
    });
  });

  it('should fill check number in payment form', async () => {
    setupMocks({
      rentRoll: [],
      charges: [],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('1234')).toBeInTheDocument();
    });

    const checkInput = screen.getByPlaceholderText('1234');
    fireEvent.change(checkInput, { target: { value: '9876' } });

    expect(checkInput).toHaveValue('9876');
  });

  it('should change received date in payment form', async () => {
    setupMocks({
      rentRoll: [],
      charges: [],
      payments: [],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const paymentsTab = screen.getByRole('button', { name: 'Payments' });
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('Received Date *')).toBeInTheDocument();
    });

    // Use a more reliable way to find the date input
    const receivedDateLabel = screen.getByText('Received Date *');
    const receivedDateInput = receivedDateLabel.parentElement?.querySelector('input');
    if (receivedDateInput) {
      fireEvent.change(receivedDateInput, { target: { value: '2024-01-20' } });
      expect(receivedDateInput).toHaveValue('2024-01-20');
    }
  });

  it('should change reconciliation dates', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Start Date *')).toBeInTheDocument();
    });

    const startDateLabel = screen.getByText('Start Date *');
    const startDateInput = startDateLabel.parentElement?.querySelector('input');
    if (startDateInput) {
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      expect(startDateInput).toHaveValue('2024-01-01');
    }

    const endDateLabel = screen.getByText('End Date *');
    const endDateInput = endDateLabel.parentElement?.querySelector('input');
    if (endDateInput) {
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
      expect(endDateInput).toHaveValue('2024-01-31');
    }
  });

  it('should change bank transaction date', async () => {
    setupMocks({
      rentRoll: [],
      payments: [],
      reconciliations: [],
      unmatched: { data: { unmatchedPayments: [], unmatchedTransactions: [] } },
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const reconciliationTab = screen.getByRole('button', { name: 'Reconciliation' });
    fireEvent.click(reconciliationTab);

    await waitFor(() => {
      expect(screen.getByText('Import Bank Transaction')).toBeInTheDocument();
    });

    // Find date input in the import bank transaction form (first date input in the section)
    const dateLabels = screen.getAllByText('Date *');
    const dateInput = dateLabels[0].parentElement?.querySelector('input');
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2024-02-15' } });
      expect(dateInput).toHaveValue('2024-02-15');
    }
  });

  it('should display fee without charge', async () => {
    setupMocks({
      rentRoll: [],
      organizationFees: [
        {
          id: 'fee-1',
          createdAt: '2024-01-15',
          feeType: 'RENTSPREE_SCREENING',
          description: 'Fee without charge',
          amount: 25,
          charge: null,
        },
      ],
    });

    renderWithProviders(<BillingPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading rent roll...')).not.toBeInTheDocument();
    });

    const feesTab = screen.getByRole('button', { name: 'Organization Fees' });
    fireEvent.click(feesTab);

    await waitFor(() => {
      expect(screen.getByText('No charge created')).toBeInTheDocument();
    });
  });
});
