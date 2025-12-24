import React from 'react';
import {  screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { PropertyDetailPage } from '../../components/pages/PropertyDetail';

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

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'property-1' }),
}));

describe('PropertyDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render property details', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'property-1',
      name: 'Test Property',
      addressLine1: '123 Main St',
      city: 'Test City',
      state: 'CA',
      units: [],
    });

    renderWithProviders(<PropertyDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Property')).toBeInTheDocument();
    });
  });

  it('should create new unit', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        id: 'property-1',
        name: 'Test Property',
        units: [],
      })
      .mockResolvedValueOnce({ data: { id: 'unit-1', name: 'Unit 1' } });

    renderWithProviders(<PropertyDetailPage />);

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Unit name');
      fireEvent.change(nameInput, { target: { value: 'Unit 1' } });
    });

    const submitButton = screen.getByText('Add unit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/properties/property-1/units',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

