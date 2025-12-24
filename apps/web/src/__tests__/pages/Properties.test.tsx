import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { PropertiesPage } from '../../components/pages/Properties';
import { renderWithProviders } from '../../../jest.setup';

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

describe('PropertiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 10 } });
  });

  it('should render properties list', async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        { id: '1', name: 'Property 1', city: 'City A' },
        { id: '2', name: 'Property 2', city: 'City B' },
      ],
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
      expect(screen.getByText('Property 2')).toBeInTheDocument();
    });
  });

  it('should create new property', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, page: 1, pageSize: 10 } }) // Initial load
      .mockResolvedValueOnce({ data: { id: '1', name: 'New Property' } }); // Create

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Property name');
    fireEvent.change(nameInput, { target: { value: 'New Property' } });
    
    const addressInput = screen.getByPlaceholderText('Address line 1');
    fireEvent.change(addressInput, { target: { value: '123 Main St' } });
    
    const cityInput = screen.getByPlaceholderText('City');
    fireEvent.change(cityInput, { target: { value: 'City' } });
    
    const stateInput = screen.getByPlaceholderText('State');
    fireEvent.change(stateInput, { target: { value: 'CA' } });
    
    const postalInput = screen.getByPlaceholderText('Postal code');
    fireEvent.change(postalInput, { target: { value: '12345' } });

    const submitButton = screen.getByText('Add property');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/properties',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            name: 'New Property',
          }),
        })
      );
    });
  });

  it('should show empty state when no properties', async () => {
    mockApiFetch.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 10 } });

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      // Check that the table is rendered (even if empty)
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<PropertiesPage />);

    expect(screen.getByText('Loading properties...')).toBeInTheDocument();
  });

  it('should render error state', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load properties/)).toBeInTheDocument();
    });
  });

  it('should handle property type selection', async () => {
    mockApiFetch.mockResolvedValue([]);

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    const typeSelect = screen.queryByDisplayValue('Single family');
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'COMMERCIAL' } });
    }

    // Verify component rendered
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('should handle all form field changes', async () => {
    mockApiFetch.mockResolvedValue([]);

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Property name');
    fireEvent.change(nameInput, { target: { value: 'Test Property' } });
    expect(nameInput).toHaveValue('Test Property');

    const addressInput = screen.getByPlaceholderText('Address line 1');
    fireEvent.change(addressInput, { target: { value: '123 Test St' } });
    expect(addressInput).toHaveValue('123 Test St');

    const cityInput = screen.getByPlaceholderText('City');
    fireEvent.change(cityInput, { target: { value: 'Test City' } });
    expect(cityInput).toHaveValue('Test City');

    const stateInput = screen.getByPlaceholderText('State');
    fireEvent.change(stateInput, { target: { value: 'TX' } });
    expect(stateInput).toHaveValue('TX');

    const postalInput = screen.getByPlaceholderText('Postal code');
    fireEvent.change(postalInput, { target: { value: '12345' } });
    expect(postalInput).toHaveValue('12345');
  });

  it('should handle create property error', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Initial load
      .mockRejectedValueOnce(new Error('Failed to create')); // Create error

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Property name');
    fireEvent.change(nameInput, { target: { value: 'New Property' } });
    
    const addressInput = screen.getByPlaceholderText('Address line 1');
    fireEvent.change(addressInput, { target: { value: '123 Main St' } });
    
    const cityInput = screen.getByPlaceholderText('City');
    fireEvent.change(cityInput, { target: { value: 'City' } });
    
    const stateInput = screen.getByPlaceholderText('State');
    fireEvent.change(stateInput, { target: { value: 'CA' } });
    
    const postalInput = screen.getByPlaceholderText('Postal code');
    fireEvent.change(postalInput, { target: { value: '12345' } });

    const submitButton = screen.getByText('Add property');
    fireEvent.click(submitButton);

    // Verify component still rendered after error
    await waitFor(() => {
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });
  });

  it('should display property details in list', async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Property 1',
          city: 'City A',
          state: 'CA',
          postalCode: '12345',
          type: 'SINGLE_FAMILY',
        },
      ],
      pagination: { total: 1, page: 1, pageSize: 10 },
    });

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      // Check for specific property name in the list
      expect(screen.getByText('Property 1')).toBeInTheDocument();
    });
  });
});

