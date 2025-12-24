import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });
  });

  it('should create new user', async () => {
    mockApiFetch
      .mockResolvedValueOnce([]) // Users
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    render(<UserManagementPage />);

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Full Name');
      fireEvent.change(nameInput, { target: { value: 'New User' } });
    });

    const submitButton = screen.getByText('Create User');
    fireEvent.click(submitButton);

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
    const nonAdminAuth = {
      token: 'test-token',
      currentRole: 'VIEWER',
    };

    jest.doMock('../../context/AuthContext', () => ({
      useAuth: () => nonAdminAuth,
    }));

    render(<UserManagementPage />);

    expect(screen.getByText(/don't have permission/)).toBeInTheDocument();
  });
});

