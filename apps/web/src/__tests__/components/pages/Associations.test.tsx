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
});

