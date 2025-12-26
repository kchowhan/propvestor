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

  it('should submit create board member form successfully', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'Test Association' }] }) // Associations
      .mockResolvedValueOnce({ data: [{ id: '1', name: 'John Doe', email: 'john@example.com' }] }) // Users
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        data: { id: '1', role: 'PRESIDENT' },
      })
      .mockResolvedValueOnce({
        data: [{ id: '1', role: 'PRESIDENT' }],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
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

    // Fill form
    const associationLabel = screen.getByText('Association *');
    const associationSelect = associationLabel.parentElement?.querySelector('select');
    if (associationSelect) {
      fireEvent.change(associationSelect, { target: { value: '1' } });
    }

    const roleLabel = screen.getByText('Role *');
    const roleSelect = roleLabel.parentElement?.querySelector('select');
    if (roleSelect) {
      fireEvent.change(roleSelect, { target: { value: 'PRESIDENT' } });
    }

    // Select a user (required for form submission)
    await waitFor(() => {
      const userLabel = screen.getByText('User (Property Manager) - Optional');
      const userSelect = userLabel.parentElement?.querySelector('select');
      if (userSelect) {
        fireEvent.change(userSelect, { target: { value: '1' } });
      }
    });

    // Get the submit button specifically (not the tab button) - it has type="submit"
    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit');
    expect(submitButton).toBeDefined();
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/board-members',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            role: 'PRESIDENT',
          }),
        })
      );
    });
  });

  it('should handle pagination', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Users
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          role: 'MEMBER_AT_LARGE',
          startDate: '2024-01-01',
          endDate: null,
          user: { id: `${i + 1}`, name: `User ${i + 1}`, email: `user${i + 1}@example.com` },
          association: { id: '1', name: 'Test Association' },
        })),
        pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + 21}`,
          role: 'MEMBER_AT_LARGE',
          startDate: '2024-01-01',
          endDate: null,
          user: { id: `${i + 21}`, name: `User ${i + 21}`, email: `user${i + 21}@example.com` },
          association: { id: '1', name: 'Test Association' },
        })),
        pagination: { total: 25, limit: 20, offset: 20, hasMore: false },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading board members...')).not.toBeInTheDocument();
    });

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading board members...')).not.toBeInTheDocument();
      // Verify table is rendered with data
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    // Ensure we're on the list tab (default)
    const listTab = screen.getByRole('button', { name: 'Board Members' });
    expect(listTab).toHaveClass('border-primary-600');

    // Wait for pagination controls to appear
    // With 25 items and limit 20, totalPages = Math.ceil(25/20) = 2, so pagination should show
    await waitFor(() => {
      expect(screen.getByText(/Showing \d+ to \d+ of 25/i)).toBeInTheDocument();
    });

    // Click next button
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();
    fireEvent.click(nextButton);

    // Verify API was called with offset=20 for page 2
    await waitFor(() => {
      const calls = mockApiFetch.mock.calls;
      const page2Call = calls.find((call: any) => 
        typeof call[0] === 'string' && call[0].includes('offset=20')
      );
      expect(page2Call).toBeDefined();
    });

    // Verify we're now on page 2 - check pagination text shows correct range
    await waitFor(() => {
      expect(screen.getByText(/Showing 21 to 25 of 25/i)).toBeInTheDocument();
    });

    // Test Prev button - go back to page 1
    const prevButton = screen.getByRole('button', { name: /prev/i });
    expect(prevButton).not.toBeDisabled();
    fireEvent.click(prevButton);

    // Verify API was called with offset=0 for page 1
    await waitFor(() => {
      const calls = mockApiFetch.mock.calls;
      const page1Call = calls.find((call: any) => 
        typeof call[0] === 'string' && call[0].includes('offset=0') && !call[0].includes('offset=20')
      );
      expect(page1Call).toBeDefined();
    });
  });

  it('should disable Prev button on first page', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [] }) // Associations
      .mockResolvedValueOnce({ data: [] }) // Users
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          role: 'MEMBER_AT_LARGE',
          startDate: '2024-01-01',
          endDate: null,
          user: { id: `${i + 1}`, name: `User ${i + 1}`, email: `user${i + 1}@example.com` },
          association: { id: '1', name: 'Test Association' },
        })),
        pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
      });

    renderWithProviders(<BoardMembersPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading board members...')).not.toBeInTheDocument();
      expect(screen.getByText(/Showing \d+ to \d+ of 25/i)).toBeInTheDocument();
    });

    // Prev button should be disabled on page 1
    const prevButton = screen.getByRole('button', { name: /prev/i });
    expect(prevButton).toBeDisabled();
  });
});

