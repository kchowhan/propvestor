'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function RegisterPage() {
  const router = useRouter();
  const { register, token } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Redirect to dashboard when token is set (after successful registration)
  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        organizationName: form.organizationName,
      });

      // Check if response indicates verification is needed
      if (response && 'message' in response && typeof response.message === 'string' && response.message.includes('verification')) {
        setRegisteredEmail(form.email);
        setSuccess(true);
        setLoading(false);
        return;
      }

      // If no verification message, registration was successful and user is logged in
      // Navigation will happen via the useEffect above when token is set
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = (err as Error).message || 'Failed to register. Please try again.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
        <div className="card w-full max-w-md shadow-large text-center p-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-ink mt-4">Registration Successful!</h2>
          <p className="text-slate-600 mt-2">
            A verification email has been sent to <strong>{registeredEmail}</strong>.
            Please check your email to verify your account before logging in.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mt-4">
            <p className="text-sm text-blue-900">
              <strong>💡 Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
            </p>
          </div>
          <Link href="/login" className="btn btn-primary mt-6">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="card w-full max-w-md shadow-large animate-slide-up">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Logo className="h-10 w-auto" />
              <div className="text-2xl font-bold text-ink">PropVestor</div>
            </div>
            <p className="text-sm text-slate-600">Create your organization account</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="label">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                className="input"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="organizationName" className="label">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="organizationName"
                className="input"
                type="text"
                value={form.organizationName}
                onChange={(e) => setForm((prev) => ({ ...prev, organizationName: e.target.value }))}
                placeholder="Acme Properties"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                This will be your property management company name
              </p>
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  <span>Creating Account...</span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

