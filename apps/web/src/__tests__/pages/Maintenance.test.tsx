import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaintenancePage } from '../../pages/Maintenance';

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

    render(<MaintenancePage />);

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

    render(<MaintenancePage />);

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Vendor Name');
      fireEvent.change(nameInput, { target: { value: 'New Vendor' } });
    });

    const submitButton = screen.getByText('Add Vendor');
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

    render(<MaintenancePage />);

    const createTab = screen.getByText('Create Work Order');
    fireEvent.click(createTab);

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

