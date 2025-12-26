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
        })),
        pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + 21}`,
          name: `Association ${i + 21}`,
        })),
        pagination: { total: 25, limit: 20, offset: 20, hasMore: false },
      });

    renderWithProviders(<AssociationsPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading associations...')).not.toBeInTheDocument();
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

