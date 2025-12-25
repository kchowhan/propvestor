import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from '@jest/globals';
import { useRouter } from 'next/navigation';
import ResendVerificationPage from '@/app/resend-verification/page';
import { apiFetch } from '@/api/client';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  apiFetch: jest.fn(),
}));

describe('ResendVerificationPage', () => {
  const mockPush = jest.fn();
  const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
  });

  it('should render form with email input', () => {
    render(<ResendVerificationPage />);

    expect(
      screen.getByRole('heading', { name: /Resend Verification Email/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Send Verification Email/i })
    ).toBeInTheDocument();
  });

  it('should send verification email on form submit', async () => {
    mockApiFetch.mockResolvedValue({
      message: 'Verification email sent successfully! Check your inbox.',
    });

    render(<ResendVerificationPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const submitButton = screen.getByRole('button', {
      name: /Send Verification Email/i,
    });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Email Sent!')).toBeInTheDocument();
      expect(
        screen.getByText(/Verification email sent successfully! Check your inbox./i)
      ).toBeInTheDocument();
    });
  });

  it('should show error on failed submission', async () => {
    mockApiFetch.mockRejectedValue(new Error('User not found'));

    render(<ResendVerificationPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const submitButton = screen.getByRole('button', {
      name: /Send Verification Email/i,
    });

    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/User not found/i)).toBeInTheDocument();
    });

    // Form should still be visible
    expect(emailInput).toBeInTheDocument();
  });

  it('should disable button while loading', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockApiFetch.mockReturnValue(promise);

    render(<ResendVerificationPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const submitButton = screen.getByRole('button', {
      name: /Send Verification Email/i,
    });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Sending.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({ message: 'Email sent' });

    await waitFor(() => {
      expect(screen.getByText('Email Sent!')).toBeInTheDocument();
    });
  });

  it('should allow sending another email after success', async () => {
    mockApiFetch.mockResolvedValue({
      message: 'Verification email sent successfully!',
    });

    render(<ResendVerificationPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(
      screen.getByRole('button', { name: /Send Verification Email/i })
    );

    await waitFor(() => {
      expect(screen.getByText('Email Sent!')).toBeInTheDocument();
    });

    // Click "Send Another Email" button
    const sendAnotherButton = screen.getByRole('button', {
      name: /Send Another Email/i,
    });
    fireEvent.click(sendAnotherButton);

    // Should return to form
    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Send Verification Email/i })
      ).toBeInTheDocument();
    });
  });

  it('should have link to login page', () => {
    render(<ResendVerificationPage />);

    const loginLinks = screen.getAllByRole('link', { name: /Back to Login/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  it('should validate email is required', async () => {
    render(<ResendVerificationPage />);

    const submitButton = screen.getByRole('button', {
      name: /Send Verification Email/i,
    });

    // Try to submit without email
    fireEvent.click(submitButton);

    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;
    expect(emailInput.validity.valid).toBe(false);
  });

  it('should display helpful tips in success state', async () => {
    mockApiFetch.mockResolvedValue({
      message: 'Email sent!',
    });

    render(<ResendVerificationPage />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(
      screen.getByRole('button', { name: /Send Verification Email/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Don't see the email\? Check your spam folder/i)
      ).toBeInTheDocument();
    });
  });
});

