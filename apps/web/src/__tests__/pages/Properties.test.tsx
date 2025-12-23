import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PropertiesPage } from '../../pages/Properties';

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

    render(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Property 1')).toBeInTheDocument();
      expect(screen.getByText('Property 2')).toBeInTheDocument();
    });
  });

  it('should create new property', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Initial load
      .mockResolvedValueOnce({ data: { id: '1', name: 'New Property' } }); // Create

    render(<PropertiesPage />);

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Property name');
      fireEvent.change(nameInput, { target: { value: 'New Property' } });
    });

    const submitButton = screen.getByText('Add Property');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/properties',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should show empty state when no properties', async () => {
    mockApiFetch.mockResolvedValue([]);

    render(<PropertiesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No properties found/)).toBeInTheDocument();
    });
  });
});

