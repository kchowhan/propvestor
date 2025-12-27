'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/api/client';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

export default function HomeownerLoginPage() {
  const { login, impersonateAsHomeowner } = useHomeownerAuth();
  const { token: userToken, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', associationId: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuperadminMode, setShowSuperadminMode] = useState(false);
  const [homeowners, setHomeowners] = useState<any[]>([]);
  const [selectedHomeownerId, setSelectedHomeownerId] = useState('');
  const [loadingHomeowners, setLoadingHomeowners] = useState(false);

  // Redirect regular users to unified login (unless they're super admin using impersonation)
  useEffect(() => {
    // Wait a bit to check auth state, then redirect if not super admin
    const timer = setTimeout(() => {
      // Only redirect if not in superadmin mode and not already logged in as super admin
      // This allows super admins to use the impersonation feature
      if (!showSuperadminMode && (!userToken || !user?.isSuperAdmin)) {
        router.replace('/login');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [showSuperadminMode, userToken, user, router]);

  // Load homeowners for superadmin selection
  useEffect(() => {
    if (showSuperadminMode && userToken && user?.isSuperAdmin) {
      setLoadingHomeowners(true);
      apiFetch('/homeowner-auth/superadmin/homeowners', { token: userToken })
        .then((data) => {
          setHomeowners(data.data || []);
        })
        .catch((err) => {
          console.error('Failed to load homeowners:', err);
          setError('Failed to load homeowners list.');
        })
        .finally(() => {
          setLoadingHomeowners(false);
        });
    }
  }, [showSuperadminMode, userToken, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (showSuperadminMode && userToken && user?.isSuperAdmin) {
        // Superadmin impersonation mode
        if (!selectedHomeownerId) {
          setError('Please select a homeowner to impersonate.');
          setLoading(false);
          return;
        }
        await impersonateAsHomeowner(selectedHomeownerId);
      } else {
        // Regular homeowner login
        console.log('Submitting homeowner login:', { email: form.email, hasPassword: !!form.password, associationId: form.associationId });
        await login(form.email, form.password, form.associationId || undefined);
      }
      router.push('/homeowner/dashboard');
    } catch (err) {
      console.error('Homeowner login error:', err);
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

          {/* Superadmin Access Toggle */}
          {userToken && user?.isSuperAdmin && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSuperadminMode}
                  onChange={(e) => setShowSuperadminMode(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-blue-900">Superadmin Access Mode</span>
              </label>
              <p className="text-xs text-blue-700 mt-1 ml-6">
                Impersonate a homeowner to access their portal
              </p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {showSuperadminMode && userToken && user?.isSuperAdmin ? (
              // Superadmin mode: Show homeowner selection
              <div>
                <label htmlFor="homeownerId" className="label">
                  Select Homeowner
                </label>
                {loadingHomeowners ? (
                  <div className="text-sm text-slate-500">Loading homeowners...</div>
                ) : (
                  <select
                    id="homeownerId"
                    className="input"
                    value={selectedHomeownerId}
                    onChange={(e) => setSelectedHomeownerId(e.target.value)}
                    required
                  >
                    <option value="">Select a homeowner...</option>
                    {homeowners.map((ho: any) => (
                      <option key={ho.id} value={ho.id}>
                        {ho.firstName} {ho.lastName} ({ho.email}) - {ho.association?.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  You are logged in as superadmin. Select a homeowner to access their portal.
                </p>
              </div>
            ) : (
              // Regular homeowner login
              <>
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
              </>
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
