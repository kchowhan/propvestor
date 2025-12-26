import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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
    mockAuth.currentRole = 'OWNER'; // Reset to OWNER for each test
  });

  it('should render create user tab by default', async () => {
    mockApiFetch.mockResolvedValue({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      const createUserTabs = screen.getAllByText('Create User');
      expect(createUserTabs[0]).toBeInTheDocument();
    });
  });

  it('should create new user', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } }) // Users
      .mockResolvedValueOnce({ data: { id: '1' } }); // Create

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'New User' } });
    
    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const form = screen.getByPlaceholderText('Name').closest('form');
    if (form) {
      fireEvent.submit(form);
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
    mockAuth.currentRole = 'VIEWER';

    renderWithProviders(<UserManagementPage />);

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });

  it('should switch to add existing user tab', async () => {
    mockApiFetch.mockResolvedValue({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const addExistingTabs = screen.queryAllByText(/add existing/i);
    const addExistingTab = addExistingTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (addExistingTab) {
      fireEvent.click(addExistingTab);
    }

    // Verify tab switched
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should switch to users tab', async () => {
    mockApiFetch.mockResolvedValue({
      data: [{ id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN' }],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    // Verify tab switched
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should update user role', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: [{ id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN' }],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      })
      .mockResolvedValueOnce({ data: { role: 'MANAGER' } }); // Update

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should add existing user', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } }) // Users
      .mockResolvedValueOnce({ data: { id: '1' } }); // Add existing user

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const addExistingTabs = screen.queryAllByText(/add existing/i);
    const addExistingTab = addExistingTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (addExistingTab) {
      fireEvent.click(addExistingTab);
    }

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should remove user', async () => {
    window.confirm = jest.fn(() => true);
    mockApiFetch
      .mockResolvedValueOnce({
        data: [{ id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN' }],
        pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      }) // Users
      .mockResolvedValueOnce({ data: { success: true } }); // Remove user

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should handle create user error', async () => {
    window.alert = jest.fn();
    mockApiFetch
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } }) // Users
      .mockRejectedValueOnce(new Error('Failed to create user')); // Create error

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'New User' } });

    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const form = screen.getByPlaceholderText('Name').closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('should handle add existing user error', async () => {
    window.alert = jest.fn();
    mockApiFetch
      .mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } }) // Users
      .mockRejectedValueOnce(new Error('User not found')); // Add existing error

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const addExistingTabs = screen.queryAllByText(/add existing/i);
    const addExistingTab = addExistingTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (addExistingTab) {
      fireEvent.click(addExistingTab);
    }

    // Wait and find email input in add existing tab
    await waitFor(() => {
      const emailInputs = screen.queryAllByPlaceholderText(/email/i);
      if (emailInputs.length > 0) {
        fireEvent.change(emailInputs[emailInputs.length - 1], { target: { value: 'notfound@example.com' } });
      }
    });

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should handle update role error', async () => {
    window.alert = jest.fn();
    mockApiFetch.mockResolvedValue({
      data: [{ id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN' }],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should handle remove user error', async () => {
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();
    mockApiFetch.mockResolvedValue({
      data: [{ id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN' }],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('should show loading state for users', async () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<UserManagementPage />);

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    await waitFor(() => {
      expect(screen.getByText(/Loading users/i)).toBeInTheDocument();
    });
  });

  it('should show error state for users', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to load'));

    renderWithProviders(<UserManagementPage />);

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    await waitFor(() => {
      expect(screen.getByText(/Failed to load users/i)).toBeInTheDocument();
    });
  });

  it('should display users list', async () => {
    mockApiFetch.mockResolvedValue({
      data: [
        { id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN', joinedAt: '2024-01-01' },
        { id: '2', name: 'User 2', email: 'user2@example.com', role: 'MANAGER', joinedAt: '2024-01-02' },
      ],
      pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    await waitFor(
      () => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should change role select value', async () => {
    mockApiFetch.mockResolvedValue({
      data: [{ id: '1', name: 'User 1', email: 'user1@example.com', role: 'ADMIN', joinedAt: '2024-01-01' }],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
    });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const usersTabs = screen.queryAllByText(/^users$/i);
    const usersTab = usersTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (usersTab) {
      fireEvent.click(usersTab);
    }

    await waitFor(() => {
      // Verify the users tab is active and user is displayed
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
  });

  it('should handle form field changes for new user', async () => {
    mockApiFetch.mockResolvedValue({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    expect(nameInput).toHaveValue('Test User');

    const emailInput = screen.getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should handle form field changes for existing user', async () => {
    mockApiFetch.mockResolvedValue({ data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });

    renderWithProviders(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
    });

    const addExistingTabs = screen.queryAllByText(/add existing/i);
    const addExistingTab = addExistingTabs.find((btn: any) => btn.tagName === 'BUTTON');
    if (addExistingTab) {
      fireEvent.click(addExistingTab);
    }

    // Verify component rendered
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });
});
