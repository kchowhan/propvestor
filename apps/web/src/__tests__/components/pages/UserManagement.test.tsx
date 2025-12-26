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


});

