'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeownerAuth } from '../../../../context/HomeownerAuthContext';
import { Logo } from '../../../../components/Logo';
import Link from 'next/link';

export default function HomeownerLoginPage() {
  const { login } = useHomeownerAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', associationId: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(form.email, form.password, form.associationId || undefined);
      router.push('/homeowner/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = (err as Error).message || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="card w-full max-w-md shadow-large animate-slide-up">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Logo className="h-10 w-auto" />
              <div className="text-2xl font-bold text-ink">PropVestor</div>
            </div>
            <p className="text-sm text-slate-600">Homeowner Portal Login</p>
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

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  <span>Logging in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <Link href="/homeowner/register" className="text-primary-600 hover:underline">
                Register here
              </Link>
            </p>
            <p className="text-sm text-slate-600">
              <Link href="/login" className="text-primary-600 hover:underline">
                Property Manager Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

