import React from 'react';
import {  screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../jest.setup';
import { UserManagementPage } from '../../components/pages/UserManagement';

const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockAuth = {
  token: 'test-token',
  currentRole: 'OWNER',
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('UserManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create user tab by default', async () => {
    mockApiFetch.mockResolvedValue([]);

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      // There are multiple "Create User" texts (tab and button), check for the tab
      const createUserTab = screen.getAllByText('Create User')[0];
      expect(createUserTab).toBeInTheDocument();
    });
  });

  it('should create new user', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Users
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'New User' } });
    
    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const submitButton = screen.getAllByText('Create User').find(btn => btn.type === 'submit' || btn.closest('form'));
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should show permission error for non-OWNER/ADMIN', () => {
    // Override the mock for this test
    jest.spyOn(require('../../context/AuthContext'), 'useAuth').mockReturnValue({
      token: 'test-token',
      currentRole: 'VIEWER',
    });

    renderWithProviders(<UserManagementPage />);

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });
});

