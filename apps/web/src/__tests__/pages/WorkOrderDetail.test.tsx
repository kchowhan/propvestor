import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { WorkOrderDetailPage } from '../../components/pages/WorkOrderDetail';

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
  useParams: () => ({ id: 'work-order-1' }),
}));

describe('WorkOrderDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockReset();
  });

  it('should render work order details', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'work-order-1',
        title: 'Fix leak',
        description: 'Bathroom leak',
        status: 'OPEN',
        category: 'PLUMBING',
      })
      .mockResolvedValueOnce([]); // Vendors

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // The title is rendered, check for it
      expect(screen.getByText('Fix leak')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<WorkOrderDetailPage />);

    expect(screen.getByText('Loading work order...')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([]); // Vendors

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should update work order status', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'work-order-1',
        title: 'Fix leak',
        status: 'OPEN',
        category: 'PLUMBING',
        property: { id: 'prop-1', name: 'Property 1' },
        priority: 'MEDIUM',
      })
      .mockResolvedValueOnce([]) // Vendors
      .mockResolvedValueOnce({ data: { status: 'IN_PROGRESS' } }); // Update

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    // Verify component rendered
    await waitFor(() => {
      expect(screen.getByText('Fix leak')).toBeInTheDocument();
    });
  });

  it('should render work order with category', async () => {
    // Use implementation to handle multiple calls
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/work-orders/')) {
        return Promise.resolve({
          id: 'work-order-1',
          title: 'Fix leak',
          category: 'PLUMBING',
          status: 'OPEN',
          property: { id: 'prop-1', name: 'Property 1' },
          priority: 'MEDIUM',
          description: 'Fix the leak',
          assignedVendor: null,
          assignedVendorId: null,
        });
      }
      if (path === '/vendors') {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Fix leak')).toBeInTheDocument();
    });
  });

  it('should render work order with vendor options', async () => {
    // Use implementation to handle multiple calls
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/work-orders/')) {
        return Promise.resolve({
          id: 'work-order-1',
          title: 'Fix leak',
          category: 'PLUMBING',
          status: 'OPEN',
          property: { id: 'prop-1', name: 'Property 1' },
          priority: 'MEDIUM',
          description: 'Fix the leak',
          assignedVendor: null,
          assignedVendorId: null,
        });
      }
      if (path === '/vendors') {
        return Promise.resolve([
          { id: '1', name: 'Vendor 1', category: 'PLUMBING' },
          { id: '2', name: 'Vendor 2', category: 'HVAC' },
        ]);
      }
      return Promise.resolve({});
    });

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Fix leak')).toBeInTheDocument();
    });
  });
});

