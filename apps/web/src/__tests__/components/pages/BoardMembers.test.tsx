import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../jest.setup';
import { BoardMembersPage } from '../../../components/pages/BoardMembers';

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

describe('BoardMembersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<BoardMembersPage />);

    expect(screen.getByText('Loading board members...')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load board members.')).toBeInTheDocument();
    });
  });

  it('should render board members list', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Users
      .mockResolvedValueOnce({
        data: [
          {
            id: '1',
            role: 'PRESIDENT',
            startDate: '2024-01-01',
            endDate: null,
            user: { id: '1', name: 'John Doe', email: 'john@example.com' },
            association: { id: '1', name: 'Test Association' },
          },
        ],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should render empty state when no board members', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Users
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.getByText('No board members found.')).toBeInTheDocument();
    });
  });

  it('should switch to create tab', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Users
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading board members...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Add Board Member' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association *')).toBeInTheDocument();
    });
  });

  it('should filter by association', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Users
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading board members...')).not.toBeInTheDocument();
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

  it('should render create form with all fields', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'John Doe', email: 'john@example.com' }] }) // Users
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading board members...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Add Board Member' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association *')).toBeInTheDocument();
      expect(screen.getByText('Role *')).toBeInTheDocument();
      expect(screen.getByText('User (Property Manager) - Optional')).toBeInTheDocument();
      expect(screen.getByText('Homeowner - Optional')).toBeInTheDocument();
      expect(screen.getByText('Start Date *')).toBeInTheDocument();
      expect(screen.getByText('End Date (Optional)')).toBeInTheDocument();
    });
  });
});

