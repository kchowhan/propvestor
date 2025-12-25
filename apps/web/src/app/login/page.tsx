'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

type UserType = 'property-manager' | 'homeowner' | 'auto';

export default function UnifiedLogin() {
  const router = useRouter();
  const { token: pmToken, loading: pmLoading, login: pmLogin } = useAuth();
  const { token: hoToken, loading: hoLoading, login: hoLogin } = useHomeownerAuth();
  const [userType, setUserType] = useState<UserType>('auto');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    associationId: '', // Optional for homeowners
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!pmLoading && !hoLoading) {
      if (pmToken) {
        router.replace('/dashboard');
      } else if (hoToken) {
        router.replace('/homeowner/dashboard');
      }
    }
  }, [pmToken, hoToken, pmLoading, hoLoading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (userType === 'homeowner') {
        // Try homeowner login only
        await hoLogin(form.email, form.password, form.associationId || undefined);
        router.push('/homeowner/dashboard');
      } else if (userType === 'property-manager') {
        // Try property manager login only
        await pmLogin(form.email, form.password);
        router.push('/dashboard');
      } else {
        // Auto-detect: Try homeowner first (most common for end-users), then property manager
        try {
          await hoLogin(form.email, form.password, form.associationId || undefined);
          router.push('/homeowner/dashboard');
        } catch (hoError) {
          // If homeowner login fails, try property manager
          try {
            await pmLogin(form.email, form.password);
            router.push('/dashboard');
          } catch (pmError) {
            throw new Error('Invalid email or password. Please check your credentials.');
          }
        }
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (pmLoading || hoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (pmToken || hoToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Redirecting...</div>
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
            <p className="text-sm text-slate-600">Sign in to your account</p>
          </div>

          {/* User Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              I am a:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUserType('auto')}
                className={`p-3 border-2 rounded-lg transition-all text-sm font-medium ${
                  userType === 'auto'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-primary-300 text-slate-700'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setUserType('property-manager')}
                className={`p-3 border-2 rounded-lg transition-all text-sm font-medium ${
                  userType === 'property-manager'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-primary-300 text-slate-700'
                }`}
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => setUserType('homeowner')}
                className={`p-3 border-2 rounded-lg transition-all text-sm font-medium ${
                  userType === 'homeowner'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-primary-300 text-slate-700'
                }`}
              >
                Homeowner
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {userType === 'auto' && 'We\'ll detect your account type automatically'}
              {userType === 'property-manager' && 'Property management portal'}
              {userType === 'homeowner' && 'HOA homeowner portal'}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">
                Email
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
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>

            {userType === 'homeowner' && (
              <div>
                <label htmlFor="associationId" className="label">
                  Association ID (Optional)
                </label>
                <input
                  id="associationId"
                  className="input"
                  type="text"
                  value={form.associationId}
                  onChange={(e) => setForm((prev) => ({ ...prev, associationId: e.target.value }))}
                  placeholder="Leave empty to find by email"
                />
                <p className="text-xs text-slate-500 mt-1">
                  If you're not sure, leave this empty
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  <span>Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {userType === 'homeowner' && (
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link href="/homeowner/register" className="text-primary-600 hover:underline">
                  Register here
                </Link>
              </p>
            )}
            {userType === 'property-manager' && (
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link href="/login" className="text-primary-600 hover:underline">
                  Sign up
                </Link>
              </p>
            )}
            {userType === 'auto' && (
              <>
                <p className="text-sm text-slate-600">
                  <Link href="/homeowner/register" className="text-primary-600 hover:underline">
                    Register as Homeowner
                  </Link>
                  {' or '}
                  <Link href="/login" className="text-primary-600 hover:underline">
                    Sign up as Property Manager
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
