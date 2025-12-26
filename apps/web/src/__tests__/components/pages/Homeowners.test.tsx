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

  it('should submit create homeowner form successfully', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        data: { id: '1', firstName: 'John', lastName: 'Doe' },
      })
      .mockResolvedValueOnce({
        data: [{ id: '1', firstName: 'John', lastName: 'Doe' }],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
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

    // Fill form
    const associationLabel = screen.getByText('Association *');
    const associationSelect = associationLabel.parentElement?.querySelector('select');
    if (associationSelect) {
      fireEvent.change(associationSelect, { target: { value: '1' } });
    }

    const firstNameLabel = screen.getByText('First Name *');
    const firstNameInput = firstNameLabel.parentElement?.querySelector('input');
    if (firstNameInput) {
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
    }

    const lastNameLabel = screen.getByText('Last Name *');
    const lastNameInput = lastNameLabel.parentElement?.querySelector('input');
    if (lastNameInput) {
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    }

    const emailLabel = screen.getByText('Email *');
    const emailInput = emailLabel.parentElement?.querySelector('input');
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    }

    const submitButton = screen.getByRole('button', { name: 'Create Homeowner' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/homeowners',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          }),
        })
      );
    });
  });

  it('should handle pagination', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Properties
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          firstName: `Homeowner ${i + 1}`,
          lastName: 'Doe',
          email: `homeowner${i + 1}@example.com`,
          status: 'ACTIVE',
        })),
        pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + 21}`,
          firstName: `Homeowner ${i + 21}`,
          lastName: 'Doe',
          email: `homeowner${i + 21}@example.com`,
          status: 'ACTIVE',
        })),
        pagination: { total: 25, limit: 20, offset: 20, hasMore: false },
      });

    renderWithProviders(<HomeownersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading homeowners...')).not.toBeInTheDocument();
    });

    // Wait for pagination controls to appear (only shows when totalPages > 1)
    await waitFor(() => {
      const nextButton = screen.queryByRole('button', { name: /next/i });
      expect(nextButton).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });
  });
});

