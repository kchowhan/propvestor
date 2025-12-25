import { render, screen, waitFor } from '@testing-library/react';
import { vi } from '@jest/globals';
import { useRouter, useSearchParams } from 'next/navigation';
import VerifyEmailPage from '@/app/verify-email/page';
import { apiFetch } from '@/api/client';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/api/client', () => ({
  apiFetch: jest.fn(),
}));

describe('VerifyEmailPage', () => {
  const mockPush = jest.fn();
  const mockApiFetch = apiFetch as jest.MockedFunction;
  const mockUseRouter = useRouter as jest.MockedFunction;
  const mockUseSearchParams = useSearchParams as jest.MockedFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
  });

  it('should show invalid state when no token provided', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    } as any);

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Invalid Link')).toBeInTheDocument();
      expect(
        screen.getByText(/Invalid verification link. No token provided./i)
      ).toBeInTheDocument();
    });
  });

  it('should verify email successfully with valid token', async () => {
    const mockToken = 'valid-token-12345';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockApiFetch.mockResolvedValue({
      verified: true,
      message: 'Your email has been verified successfully!',
    });

    render(<VerifyEmailPage />);

    // Should start in verifying state
    expect(screen.getByText(/Verifying your email address.../i)).toBeInTheDocument();

    // Should transition to success state
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(
        screen.getByText(/Your email has been verified successfully!/i)
      ).toBeInTheDocument();
    });

    // Should call API with correct token
    expect(mockApiFetch).toHaveBeenCalledWith('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: mockToken }),
    });

    // Should show countdown
    expect(screen.getByText(/Redirecting to login in 5 seconds.../i)).toBeInTheDocument();
  });

  it('should handle verification error', async () => {
    const mockToken = 'expired-token-12345';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockApiFetch.mockRejectedValue(new Error('Token has expired'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText(/Token has expired/i)).toBeInTheDocument();
    });

    // Should show action buttons
    expect(
      screen.getByRole('link', { name: /Request New Verification Email/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Login/i })).toBeInTheDocument();
  });

  it('should handle API returning verified false', async () => {
    const mockToken = 'invalid-token-12345';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockApiFetch.mockResolvedValue({
      verified: false,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to verify email. Please try again./i)
      ).toBeInTheDocument();
    });
  });

  it('should redirect to login after countdown', async () => {
    jest.useFakeTimers();
    
    const mockToken = 'valid-token-12345';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockApiFetch.mockResolvedValue({
      verified: true,
      message: 'Email verified!',
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    jest.useRealTimers();
  });

  it('should have link to resend verification', async () => {
    const mockToken = 'invalid-token';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockApiFetch.mockRejectedValue(new Error('Invalid token'));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      const resendLink = screen.getByRole('link', {
        name: /Request New Verification Email/i,
      });
      expect(resendLink).toHaveAttribute('href', '/resend-verification');
    });
  });

  it('should have link to login page', async () => {
    const mockToken = 'valid-token';
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockApiFetch.mockResolvedValue({
      verified: true,
      message: 'Email verified!',
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      const loginLink = screen.getByRole('link', { name: /Go to Login Now/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });
});

