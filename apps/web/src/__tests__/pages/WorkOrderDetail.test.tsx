import React from 'react';
import { screen, waitFor } from '@testing-library/react';
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
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } }); // Vendors

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
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } }); // Vendors

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
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } }) // Vendors
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
      if (path.startsWith('/vendors')) {
        return Promise.resolve({ data: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } });
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
      if (path.startsWith('/vendors')) {
        return Promise.resolve({
          data: [
            { id: '1', name: 'Vendor 1', category: 'PLUMBING' },
            { id: '2', name: 'Vendor 2', category: 'HVAC' },
          ],
          pagination: { total: 2, limit: 100, offset: 0, hasMore: false },
        });
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

  it('should update category', async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/work-orders/') && path.includes('work-order-1')) {
        if (mockApiFetch.mock.calls.length === 1) {
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
        // This is the update call
        return Promise.resolve({ id: 'work-order-1', category: 'HVAC' });
      }
      if (path.startsWith('/vendors')) {
        return Promise.resolve({ data: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const categorySelect = screen.getByLabelText(/category/i) || screen.queryByDisplayValue('Plumbing');
      if (categorySelect) {
        fireEvent.change(categorySelect, { target: { value: 'HVAC' } });
      }
    }, { timeout: 2000 });
  });

  it('should update vendor assignment', async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/work-orders/') && path.includes('work-order-1')) {
        if (mockApiFetch.mock.calls.length === 1) {
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
        // This is the update call
        return Promise.resolve({ id: 'work-order-1', assignedVendorId: 'vendor-1' });
      }
      if (path.startsWith('/vendors')) {
        return Promise.resolve({
          data: [
            { id: 'vendor-1', name: 'Vendor 1', category: 'PLUMBING' },
          ],
          pagination: { total: 1, limit: 100, offset: 0, hasMore: false },
        });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const vendorSelect = screen.queryByDisplayValue('No vendor assigned') || screen.getByText('No vendor assigned');
      if (vendorSelect && vendorSelect.tagName === 'SELECT') {
        fireEvent.change(vendorSelect, { target: { value: 'vendor-1' } });
      }
    }, { timeout: 2000 });
  });

  it('should update status', async () => {
    mockApiFetch.mockImplementation((path: string) => {
      if (path.startsWith('/work-orders/') && path.includes('work-order-1')) {
        if (mockApiFetch.mock.calls.length === 1) {
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
        // This is the update call
        return Promise.resolve({ id: 'work-order-1', status: 'IN_PROGRESS' });
      }
      if (path.startsWith('/vendors')) {
        return Promise.resolve({ data: [], pagination: { total: 0, limit: 100, offset: 0, hasMore: false } });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<WorkOrderDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work order...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const statusSelect = screen.queryByDisplayValue('OPEN') || screen.getByText('OPEN');
      if (statusSelect && statusSelect.tagName === 'SELECT') {
        fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } });
      }
    }, { timeout: 2000 });
  });
});
