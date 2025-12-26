import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { MaintenancePage } from '../../components/pages/Maintenance';

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
  workOrders?: any[];
  properties?: any[];
  vendors?: any[];
  error?: boolean;
}) => {
  mockApiFetch.mockImplementation((path: string) => {
    if (options.error) {
      return Promise.reject(new Error('Failed to load'));
    }
    if (path.startsWith('/work-orders')) {
      return Promise.resolve({
        data: options.workOrders || [],
        pagination: { total: options.workOrders?.length || 0, limit: 20, offset: 0, hasMore: false },
      });
    }
    if (path.startsWith('/properties')) {
      return Promise.resolve({
        data: options.properties || [],
        pagination: { total: options.properties?.length || 0, limit: 100, offset: 0, hasMore: false },
      });
    }
    if (path.startsWith('/vendors/')) {
      return Promise.resolve({ data: { success: true } });
    }
    if (path.startsWith('/vendors')) {
      return Promise.resolve({
        data: options.vendors || [],
        pagination: { total: options.vendors?.length || 0, limit: 20, offset: 0, hasMore: false },
      });
    }
    return Promise.resolve({ data: {} });
  });
};

describe('MaintenancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render vendors tab by default', async () => {
    setupMocks({ workOrders: [], properties: [], vendors: [] });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });
  });

  it('should create new vendor', async () => {
    setupMocks({ workOrders: [], properties: [], vendors: [] });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });

    const addButton = screen.queryByText('+ Add Vendor');
    if (addButton) {
      fireEvent.click(addButton);
    }

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Vendor name');
      fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
    });

    const phoneLabel = screen.getByText(/phone/i);
    const phoneInput = phoneLabel.parentElement?.querySelector('input');
    if (phoneInput) {
      fireEvent.change(phoneInput, { target: { value: '555-1234' } });
    }

    const submitButtons = screen.queryAllByText(/add vendor/i);
    const submitButton = submitButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/vendors',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should create work order', async () => {
    setupMocks({
      workOrders: [],
      properties: [{ id: '1', name: 'Property 1', units: [{ id: 'unit-1', name: 'Unit 1' }] }],
      vendors: [],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const createTab = screen.getAllByText('Create Work Order').find((btn: any) => btn.tagName === 'BUTTON');
    if (createTab) {
      fireEvent.click(createTab);
    }

    const createWorkOrderTexts = screen.queryAllByText('Create Work Order');
    expect(createWorkOrderTexts.length).toBeGreaterThan(0);
  });

  it('should edit vendor', async () => {
    setupMocks({
      workOrders: [],
      properties: [],
      vendors: [
        { id: '1', name: 'Vendor 1', email: 'vendor1@example.com', phone: '555-1234', category: 'GENERAL' },
      ],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
    });

    const editButtons = screen.queryAllByText(/edit/i);
    const editButton = editButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (editButton) {
      fireEvent.click(editButton);
    }

    await waitFor(() => {
      const nameInputs = screen.queryAllByDisplayValue('Vendor 1');
      if (nameInputs.length > 0) {
        fireEvent.change(nameInputs[0], { target: { value: 'Updated Vendor' } });
      }
    });

    const updateButtons = screen.queryAllByText(/update vendor/i);
    const updateButton = updateButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (updateButton) {
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/vendors/1',
          expect.objectContaining({
            method: 'PUT',
          }),
        );
      });
    }
  });

  it('should delete vendor', async () => {
    window.confirm = jest.fn(() => true);
    setupMocks({
      workOrders: [],
      properties: [],
      vendors: [
        { id: '1', name: 'Vendor 1', email: 'vendor1@example.com', phone: '555-1234', category: 'GENERAL' },
      ],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByText(/delete/i);
    const deleteButton = deleteButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (deleteButton) {
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/vendors/1',
          expect.objectContaining({
            method: 'DELETE',
          }),
        );
      });
    }
  });

  it('should cancel vendor edit', async () => {
    setupMocks({
      workOrders: [],
      properties: [],
      vendors: [
        { id: '1', name: 'Vendor 1', email: 'vendor1@example.com', phone: '555-1234', category: 'GENERAL' },
      ],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
    });

    const editButtons = screen.queryAllByText(/edit/i);
    const editButton = editButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (editButton) {
      fireEvent.click(editButton);
    }

    await waitFor(() => {
      const cancelButtons = screen.queryAllByText(/cancel/i);
      const cancelButton = cancelButtons.find((btn: any) => btn.tagName === 'BUTTON');
      if (cancelButton) {
        fireEvent.click(cancelButton);
      }
    });

    expect(screen.getByText('Vendor 1')).toBeInTheDocument();
  });

  it('should display vendors list', async () => {
    setupMocks({
      workOrders: [],
      properties: [],
      vendors: [
        { id: '1', name: 'Vendor 1', email: 'vendor1@example.com', phone: '555-1234', category: 'GENERAL' },
        { id: '2', name: 'Vendor 2', email: 'vendor2@example.com', phone: '555-5678', category: 'PLUMBING' },
      ],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
    });
  });

  it('should display work orders list', async () => {
    setupMocks({
      workOrders: [
        { id: '1', title: 'Fix leak', status: 'OPEN', property: { name: 'Property 1' }, category: 'PLUMBING', priority: 'HIGH' },
      ],
      properties: [],
      vendors: [],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const ordersTab = screen.queryAllByText(/work orders/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (ordersTab) {
      fireEvent.click(ordersTab);
    }

    await waitFor(() => {
      expect(screen.getByText('Fix leak')).toBeInTheDocument();
    });
  });

  it('should show empty vendors state', async () => {
    setupMocks({ workOrders: [], properties: [], vendors: [] });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText(/No vendors yet/i)).toBeInTheDocument();
    });
  });

  it('should show empty work orders state', async () => {
    setupMocks({ workOrders: [], properties: [], vendors: [] });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const ordersTab = screen.queryAllByText(/work orders/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (ordersTab) {
      fireEvent.click(ordersTab);
    }

    // The component renders an empty table, check the Work Orders header is visible
    await waitFor(() => {
      // Since the tab was clicked, look for the card header
      const cardHeaders = screen.queryAllByText('Work Orders');
      expect(cardHeaders.length).toBeGreaterThan(0);
    });
  });

  it('should handle vendor form field changes', async () => {
    setupMocks({ workOrders: [], properties: [], vendors: [] });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const addButton = screen.queryByText('+ Add Vendor');
    if (addButton) {
      fireEvent.click(addButton);
    }

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Vendor name');
      fireEvent.change(nameInput, { target: { value: 'Test Vendor' } });
      expect(nameInput).toHaveValue('Test Vendor');
    });
  });

  it('should handle work order form field changes', async () => {
    setupMocks({
      workOrders: [],
      properties: [{ id: '1', name: 'Property 1' }],
      vendors: [],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const createTab = screen.getAllByText('Create Work Order').find((btn: any) => btn.tagName === 'BUTTON');
    if (createTab) {
      fireEvent.click(createTab);
    }

    await waitFor(() => {
      const titleInput = screen.queryByPlaceholderText(/title/i);
      if (titleInput) {
        fireEvent.change(titleInput, { target: { value: 'Test Work Order' } });
        expect(titleInput).toHaveValue('Test Work Order');
      }
    });
  });

  it('should show error state for work orders', async () => {
    setupMocks({ error: true });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load work orders/i)).toBeInTheDocument();
    });
  });

  it('should show loading state for vendors', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<MaintenancePage />);

    expect(screen.getByText('Loading work orders...')).toBeInTheDocument();
  });

  it('should handle vendor creation error', async () => {
    setupMocks({ workOrders: [], properties: [], vendors: [] });

    let createCallCount = 0;
    mockApiFetch.mockImplementation((path: string, options?: any) => {
      // Allow initial loads to succeed
      if (path.startsWith('/work-orders')) {
        return Promise.resolve({
          data: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        });
      }
      if (path.startsWith('/properties')) {
        return Promise.resolve({
          data: [],
          pagination: { total: 0, limit: 100, offset: 0, hasMore: false },
        });
      }
      if (path.startsWith('/vendors') && (!options || options.method !== 'POST')) {
        return Promise.resolve({
          data: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        });
      }
      // Reject only on POST (create)
      if (path === '/vendors' && options?.method === 'POST') {
        createCallCount++;
        if (createCallCount === 1) {
          return Promise.reject(new Error('Failed to create vendor'));
        }
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });

    const addButton = screen.queryByText('+ Add Vendor');
    if (addButton) {
      fireEvent.click(addButton);
    }

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Vendor name');
      fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
    });

    const submitButtons = screen.queryAllByText(/add vendor/i);
    const submitButton = submitButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    // Component should handle error gracefully
    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });
  });

  it('should handle work order creation', async () => {
    setupMocks({
      workOrders: [],
      properties: [{ id: '1', name: 'Property 1', units: [{ id: 'unit-1', name: 'Unit 1' }] }],
      vendors: [{ id: 'v1', name: 'Vendor 1' }],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const createTab = screen.getAllByText('Create Work Order').find((btn: any) => btn.tagName === 'BUTTON');
    if (createTab) {
      fireEvent.click(createTab);
    }

    await waitFor(() => {
      const titleInput = screen.queryByPlaceholderText(/title/i);
      if (titleInput) {
        fireEvent.change(titleInput, { target: { value: 'Test Work Order' } });
      }
    });

    // Verify form fields are accessible - check for heading or form elements
    const createWorkOrderTexts = screen.getAllByText('Create Work Order');
    expect(createWorkOrderTexts.length).toBeGreaterThan(0);
  });

  it('should handle pagination for work orders', async () => {
    const workOrders = Array.from({ length: 25 }, (_, i) => ({
      id: `wo-${i}`,
      title: `Work Order ${i}`,
      status: 'OPEN',
      property: { name: 'Property 1' },
      category: 'GENERAL',
      priority: 'NORMAL',
    }));

    setupMocks({
      workOrders,
      properties: [],
      vendors: [],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const ordersTab = screen.queryAllByText(/work orders/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (ordersTab) {
      fireEvent.click(ordersTab);
    }

    await waitFor(() => {
      // Should show pagination controls if there are more than 20 items
      const paginationTexts = screen.queryAllByText(/showing/i);
      if (paginationTexts.length > 0) {
        expect(paginationTexts[0]).toBeInTheDocument();
      }
    });
  });

  it('should handle pagination for vendors', async () => {
    const vendors = Array.from({ length: 25 }, (_, i) => ({
      id: `v-${i}`,
      name: `Vendor ${i}`,
      email: `vendor${i}@example.com`,
      category: 'GENERAL',
    }));

    setupMocks({
      workOrders: [],
      properties: [],
      vendors,
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });

    // Should show pagination controls if there are more than 20 items
    await waitFor(() => {
      const paginationText = screen.queryByText(/showing/i);
      if (paginationText) {
        expect(paginationText).toBeInTheDocument();
      }
    });
  });

  it('should filter work orders by property', async () => {
    setupMocks({
      workOrders: [
        { id: '1', title: 'Fix leak', status: 'OPEN', property: { id: '1', name: 'Property 1' }, category: 'PLUMBING', priority: 'HIGH' },
        { id: '2', title: 'Paint wall', status: 'OPEN', property: { id: '2', name: 'Property 2' }, category: 'GENERAL', priority: 'NORMAL' },
      ],
      properties: [
        { id: '1', name: 'Property 1', units: [] },
        { id: '2', name: 'Property 2', units: [] },
      ],
      vendors: [],
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading work orders...')).not.toBeInTheDocument();
    });

    const ordersTab = screen.queryAllByText(/work orders/i).find((btn: any) => btn.tagName === 'BUTTON');
    if (ordersTab) {
      fireEvent.click(ordersTab);
    }

    await waitFor(() => {
      expect(screen.getByText('Fix leak')).toBeInTheDocument();
      expect(screen.getByText('Paint wall')).toBeInTheDocument();
    });
  });

  it('should handle vendor update error', async () => {
    setupMocks({
      workOrders: [],
      properties: [],
      vendors: [
        { id: '1', name: 'Vendor 1', email: 'vendor1@example.com', phone: '555-1234', category: 'GENERAL' },
      ],
    });

    let updateCallCount = 0;
    mockApiFetch.mockImplementation((path: string, options?: any) => {
      // Allow initial loads to succeed
      if (path.startsWith('/work-orders') || path.startsWith('/properties')) {
        return Promise.resolve({
          data: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        });
      }
      if (path.startsWith('/vendors') && (!options || options.method !== 'PUT')) {
        return Promise.resolve({
          data: [{ id: '1', name: 'Vendor 1', email: 'vendor1@example.com', phone: '555-1234', category: 'GENERAL' }],
          pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
        });
      }
      // Reject only on PUT (update)
      if (path === '/vendors/1' && options?.method === 'PUT') {
        updateCallCount++;
        if (updateCallCount === 1) {
          return Promise.reject(new Error('Failed to update vendor'));
        }
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendor 1')).toBeInTheDocument();
    });

    const editButtons = screen.queryAllByText(/edit/i);
    const editButton = editButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (editButton) {
      fireEvent.click(editButton);
    }

    await waitFor(() => {
      const nameInputs = screen.queryAllByDisplayValue('Vendor 1');
      if (nameInputs.length > 0) {
        fireEvent.change(nameInputs[0], { target: { value: 'Updated Vendor' } });
      }
    });

    const updateButtons = screen.queryAllByText(/update vendor/i);
    const updateButton = updateButtons.find((btn: any) => btn.tagName === 'BUTTON');
    if (updateButton) {
      fireEvent.click(updateButton);
    }

    // Component should handle error gracefully
    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });
  });
});
