import React from 'react';
import {  screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { MaintenancePage } from '../../components/pages/Maintenance';

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

describe('MaintenancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render vendors tab by default', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Work orders
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]); // Vendors

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });
  });

  it('should create new vendor', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Work orders
      .mockResolvedValueOnce([]) // Properties
      .mockResolvedValueOnce([]) // Vendors
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    renderWithProviders(<MaintenancePage />);

    await waitFor(() => {
      expect(screen.getByText('Vendors')).toBeInTheDocument();
    });

    // Wait for vendor form to be available and click Add Vendor button if needed
    await waitFor(() => {
      const addButton = screen.queryByText('+ Add Vendor');
      if (addButton) {
        fireEvent.click(addButton);
      }
    });

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Vendor name');
      fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
    });

    const phoneLabel = screen.getByText(/phone/i);
    const phoneInput = phoneLabel.parentElement?.querySelector('input');
    if (phoneInput) {
      fireEvent.change(phoneInput, { target: { value: '555-1234' } });
    }

    const submitButton = screen.getByText(/add vendor/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/vendors',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should create work order', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Work orders
      .mockResolvedValueOnce([
        { id: '1', name: 'Property 1' },
      ]) // Properties
      .mockResolvedValueOnce([]) // Vendors
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    renderWithProviders(<MaintenancePage />);

    const createTab = screen.getAllByText('Create Work Order').find(btn => btn.tagName === 'BUTTON');
    if (createTab) {
      fireEvent.click(createTab);
    }

    await waitFor(() => {
      const titleInput = screen.getByPlaceholderText('Title');
      fireEvent.change(titleInput, { target: { value: 'Fix leak' } });
    });

    const submitButton = screen.getByText('Create Work Order');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/work-orders',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

