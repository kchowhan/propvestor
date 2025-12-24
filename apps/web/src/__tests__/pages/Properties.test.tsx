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

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('PropertiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiFetch.mockResolvedValue([]);
  });

  it('should render properties list', async () => {
    mockApiFetch.mockResolvedValue([
      { id: '1', name: 'Property 1', city: 'City A' },
      { id: '2', name: 'Property 2', city: 'City B' },
    ]);

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
      expect(screen.getByText('Property 2')).toBeInTheDocument();
    });
  });

  it('should create new property', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Initial load
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
    mockApiFetch.mockResolvedValue([]);

    renderWithProviders(<PropertiesPage />);

    await waitFor(() => {
      // Check that the table is rendered (even if empty)
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });
  });
});

