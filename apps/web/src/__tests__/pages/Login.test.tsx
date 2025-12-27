import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../../components/pages/Login';
import { renderWithProviders } from '../../../jest.setup';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockPush,
  }),
}));

// Mock AuthContext
const mockLogin = jest.fn();
const mockRegister = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    token: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should switch to register mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const switchButton = screen.getByText(/register/i);
    await user.click(switchButton);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
  });

  it('should call login on form submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined as any);
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should call register on form submit in register mode', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue(undefined as any);
    renderWithProviders(<LoginPage />);

    // Switch to register
    await user.click(screen.getByText(/register/i));

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Just verify register was called - don't wait for email notice since mock returns undefined
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        organizationName: 'Test Org',
      });
    }, { timeout: 3000 });
  });

  it('should display error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid email or password.'));
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      // The error message should be displayed - check for the actual error message
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('should show verification notice after registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({
      message: 'Registration successful. Please check your email for verification link.',
      user: { email: 'test@example.com' },
    } as any);
    renderWithProviders(<LoginPage />);

    // Switch to register
    await user.click(screen.getByText(/register/i));

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Check Your Email/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it('should allow returning to login from verification notice', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({
      message: 'Registration successful. Please check your email for verification link.',
    } as any);
    renderWithProviders(<LoginPage />);

    // Switch to register and submit
    await user.click(screen.getByText(/register/i));
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Should show verification notice
    await waitFor(() => {
      expect(screen.getByText(/Check Your Email/i)).toBeInTheDocument();
    });

    // Click back to login
    const backButton = screen.getByRole('button', { name: /Back to Login/i });
    await user.click(backButton);

    // Should return to login form
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('should handle registration without verification notice', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({
      user: { email: 'test@example.com' },
      // No verification message
    } as any);
    renderWithProviders(<LoginPage />);

    // Switch to register
    await user.click(screen.getByText(/register/i));

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
      // Should not show verification notice if message doesn't include 'verification'
      expect(screen.queryByText(/Check Your Email/i)).not.toBeInTheDocument();
    });
  });

  it('should display error message on registration failure', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue(new Error('Registration failed'));
    renderWithProviders(<LoginPage />);

    // Switch to register
    await user.click(screen.getByText(/register/i));

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/organization name/i), 'Test Org');

    // Submit
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it('should switch back to login from register mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // Switch to register
    await user.click(screen.getByText(/register/i));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();

    // Switch back to login
    const switchButton = screen.getByText(/sign in/i);
    await user.click(switchButton);

    await waitFor(() => {
      expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it('should redirect when token is set', async () => {
    // Mock useAuth to return a token
    jest.spyOn(require('../../context/AuthContext'), 'useAuth').mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      token: 'test-token', // Token is set
    });

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});

