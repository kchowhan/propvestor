import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../jest.setup';
import { HomeownersPage } from '../../../components/pages/Homeowners';

const mockApiFetch = jest.fn();
jest.mock('../../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockAuth = {
  token: 'test-token',
};

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('HomeownersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<HomeownersPage />);

    expect(screen.getByText('Loading homeowners...')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load homeowners.')).toBeInTheDocument();
    });
  });

  it('should render homeowners list', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            status: 'ACTIVE',
            association: { id: '1', name: 'Test Association' },
            accountBalance: '0',
          },
        ],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should render empty state when no homeowners', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.getByText('No homeowners found.')).toBeInTheDocument();
    });
  });

  it('should switch to create tab', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading homeowners...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Homeowner' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association *')).toBeInTheDocument();
    });
  });

  it('should filter by association', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading homeowners...')).not.toBeInTheDocument();
    });

    // Find the filter select by looking for "All Associations" option
    const allSelects = screen.getAllByRole('combobox');
    const associationFilter = allSelects[0]; // First select should be the association filter
    if (associationFilter) {
      fireEvent.change(associationFilter, { target: { value: '1' } });
    }

    await waitFor(() => {
      // Check that a new query was made with the filter
      const calls = mockApiFetch.mock.calls;
      const filteredCall = calls.find((call: any) => 
        call[0]?.includes('associationId=1')
      );
      expect(filteredCall).toBeDefined();
    });
  });

  it('should filter by status', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading homeowners...')).not.toBeInTheDocument();
    });

    // Find the status filter (second select)
    const allSelects = screen.getAllByRole('combobox');
    const statusFilter = allSelects[1]; // Second select should be the status filter
    if (statusFilter) {
      fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
    }

    await waitFor(() => {
      // Check that a new query was made with the filter
      const calls = mockApiFetch.mock.calls;
      const filteredCall = calls.find((call: any) => 
        call[0]?.includes('status=ACTIVE')
      );
      expect(filteredCall).toBeDefined();
    });
  });

  it('should render create form with all fields', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading homeowners...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Homeowner' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association *')).toBeInTheDocument();
      expect(screen.getByText('Property (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Unit (Optional)')).toBeInTheDocument();
      expect(screen.getByText('First Name *')).toBeInTheDocument();
      expect(screen.getByText('Last Name *')).toBeInTheDocument();
      expect(screen.getByText('Email *')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });
});

