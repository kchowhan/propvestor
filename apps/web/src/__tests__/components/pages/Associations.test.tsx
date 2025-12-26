import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../jest.setup';
import { AssociationsPage } from '../../../components/pages/Associations';

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

describe('AssociationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<AssociationsPage />);

    expect(screen.getByText('Loading associations...')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load associations/)).toBeInTheDocument();
    });
  });

  it('should render associations list', async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Test Association',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          email: 'test@example.com',
          phone: '555-1234',
          homeownerCount: 10,
          propertyCount: 5,
          boardMemberCount: 3,
          isActive: true,
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Association')).toBeInTheDocument();
    });
  });

  it('should render empty state when no associations', async () => {
    mockApiFetch.mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.getByText('No associations found.')).toBeInTheDocument();
    });
  });

  it('should switch to create tab', async () => {
    mockApiFetch.mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association Name *')).toBeInTheDocument();
    });
  });

  it('should fill in create association form', async () => {
    mockApiFetch.mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association Name *')).toBeInTheDocument();
    });

    const nameLabel = screen.getByText('Association Name *');
    const nameInput = nameLabel.parentElement?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'New Association' } });
      expect(nameInput).toHaveValue('New Association');
    }

    const emailLabel = screen.getByText('Email');
    const emailInput = emailLabel.parentElement?.querySelector('input');
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      expect(emailInput).toHaveValue('new@example.com');
    }
  });

  it('should render create form with all fields', async () => {
    mockApiFetch.mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association Name *')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Website')).toBeInTheDocument();
      expect(screen.getByText('Address Line 1')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('State')).toBeInTheDocument();
      expect(screen.getByText('Postal Code')).toBeInTheDocument();
    });
  });

  it('should submit create association form successfully', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({
        data: { id: '1', name: 'New Association' },
      })
      .mockResolvedValueOnce({
        data: [{ id: '1', name: 'New Association' }],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association Name *')).toBeInTheDocument();
    });

    const nameLabel = screen.getByText('Association Name *');
    const nameInput = nameLabel.parentElement?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'New Association' } });
    }

    const submitButton = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/associations',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            name: 'New Association',
          }),
        })
      );
    });
  });

  it('should handle create association form submission error', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockRejectedValueOnce(new Error('Failed to create association'));

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association Name *')).toBeInTheDocument();
    });

    const nameLabel = screen.getByText('Association Name *');
    const nameInput = nameLabel.parentElement?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'New Association' } });
    }

    const submitButton = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/associations',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should show loading state during form submission', async () => {
    let resolveCreate: (value: any) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });

    mockApiFetch
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockReturnValueOnce(createPromise);

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    const createTab = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByText('Association Name *')).toBeInTheDocument();
    });

    const nameLabel = screen.getByText('Association Name *');
    const nameInput = nameLabel.parentElement?.querySelector('input');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'New Association' } });
    }

    const submitButton = screen.getByRole('button', { name: 'Create Association' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument();
    });

    resolveCreate!({ data: { id: '1', name: 'New Association' } });
  });

  it('should handle pagination', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Association ${i + 1}`,
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
        })),
        pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + 21}`,
          name: `Association ${i + 21}`,
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
        })),
        pagination: { total: 25, limit: 20, offset: 20, hasMore: false },
      });

    renderWithProviders(<AssociationsPage />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
      expect(screen.getByText('Association 1')).toBeInTheDocument();
    });

    // Ensure we're on the list tab
    const listTab = screen.getByRole('button', { name: 'Associations' });
    expect(listTab).toHaveClass('border-primary-600');

    // Wait for pagination controls to appear (shows "Showing X to Y of Z")
    // With 25 items and limit 20, totalPages = Math.ceil(25/20) = 2, so pagination should show
    await waitFor(() => {
      expect(screen.getByText(/Showing \d+ to \d+ of 25 associations/i)).toBeInTheDocument();
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
      expect(screen.getByText(/Showing 21 to 25 of 25 associations/i)).toBeInTheDocument();
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

  it('should not show pagination when only one page', async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Test Association',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
        },
      ],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
    });

    // Pagination should not appear when totalPages <= 1
    const nextButton = screen.queryByRole('button', { name: /next/i });
    expect(nextButton).not.toBeInTheDocument();
  });
});

