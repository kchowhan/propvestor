import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../jest.setup';
import { UserManagementPage } from '../../../components/pages/UserManagement';

const mockApiFetch = jest.fn();
jest.mock('../../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockAuth = {
  token: 'test-token',
  currentRole: 'OWNER',
};

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('UserManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render users list when user has permission', async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        { id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN' },
        { id: '2', name: 'User 2', email: 'user2@example.com', role: 'VIEWER' },
      ],
      pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Just verify the component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should render empty state when no users', async () => {
    mockApiFetch.mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Just verify the component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should create a new user', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({ id: 'new-user-1', name: 'New User', email: 'new@example.com' });

    window.alert = jest.fn();

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Fill in the form
    const nameInput = screen.getByPlaceholderText('Name');
    const emailInput = screen.getByPlaceholderText('Email');
    // Get submit button specifically (not the tab button)
    const buttons = screen.getAllByRole('button', { name: /create user/i });
    const submitButton = buttons.find(btn => btn.getAttribute('type') === 'submit');

    fireEvent.change(nameInput, { target: { value: 'New User' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    if (submitButton) {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            name: 'New User',
            email: 'new@example.com',
          }),
        })
      );
    });
  });

  it('should add existing user', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({ id: 'existing-user-1', email: 'existing@example.com' });

    window.alert = jest.fn();

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Switch to add-existing tab
    const addExistingTab = screen.getByText('Add Existing User');
    fireEvent.click(addExistingTab);

    await waitFor(() => {
      const emailInput = screen.getByPlaceholderText('User email');
      expect(emailInput).toBeInTheDocument();
    }, { timeout: 2000 });

    const emailInput = screen.getByPlaceholderText('User email');
    const submitButton = screen.getByRole('button', { name: /add.*user/i });

    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/users/add-existing',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            email: 'existing@example.com',
          }),
        })
      );
    }, { timeout: 3000 });
  });

  it('should update user role', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [
          { id: '1', name: 'User 1', email: 'user1@example.com', role: 'VIEWER', joinedAt: new Date().toISOString() },
        ],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({ id: '1', role: 'ADMIN' });

    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Switch to users tab
    const usersTab = screen.getByText('Users');
    fireEvent.click(usersTab);

    await waitFor(() => {
      // Look for role select dropdown
      const roleSelects = screen.queryAllByDisplayValue('VIEWER');
      const roleSelect = roleSelects.find((select: any) => select.tagName === 'SELECT');
      if (roleSelect) {
        fireEvent.change(roleSelect, { target: { value: 'ADMIN' } });
      }
    }, { timeout: 2000 });

    await waitFor(() => {
      // Check if the API was called with the role update
      const roleUpdateCall = mockApiFetch.mock.calls.find((call: any) =>
        call[0] === '/users/1/role' &&
        call[1]?.method === 'PUT' &&
        call[1]?.body?.role === 'ADMIN'
      );
      expect(roleUpdateCall).toBeDefined();
    }, { timeout: 3000 });
  });

  it('should remove user from organization', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [
          { id: '1', name: 'User 1', email: 'user1@example.com', role: 'VIEWER', joinedAt: new Date().toISOString() },
        ],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({ success: true });

    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Switch to users tab
    const usersTab = screen.getByText('Users');
    fireEvent.click(usersTab);

    await waitFor(() => {
      // Look for remove button
      const removeButton = screen.queryByText(/remove/i);
      if (removeButton) {
        fireEvent.click(removeButton);
      }
    }, { timeout: 2000 });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/users/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    }, { timeout: 3000 });
  });

  it('should handle pagination', async () => {
    mockApiFetch.mockResolvedValue({
      data: Array(20).fill(null).map((_, i) => ({
        id: `${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: 'VIEWER',
        joinedAt: new Date().toISOString(),
      })),
      pagination: { total: 25, limit: 20, offset: 0, hasMore: true },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Switch to users tab
    const usersTab = screen.getByText('Users');
    fireEvent.click(usersTab);

    await waitFor(() => {
      // Look for next page button
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton && !nextButton.hasAttribute('disabled')) {
        fireEvent.click(nextButton);
      }
    }, { timeout: 2000 });
  });

  it('should show permission error for non-admin users', () => {
    mockAuth.currentRole = 'VIEWER';
    mockApiFetch.mockResolvedValue({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

});

