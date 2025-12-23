'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';

export const LoginPage = () => {
  const { login, register } = useAuth();
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          organizationName: form.organizationName,
        });
      } else {
        await login(form.email, form.password);
      }
      // Navigate to dashboard after successful login/register
      router.replace('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError((err as Error).message || 'Failed to login. Please check your credentials.');
    } finally {
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
              <div className="text-2xl font-bold text-ink">
                PropVestor
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {isRegister ? 'Create your organization account' : 'Log in to manage your portfolio'}
            </p>
          </div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="label">Organization Name</label>
                  <input
                    className="input"
                    value={form.organizationName}
                    onChange={(e) => handleChange('organizationName', e.target.value)}
                    placeholder="Acme Properties"
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary w-full py-3 text-base"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner"></div>
                  <span>Processing...</span>
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              className="text-sm text-slate-600 hover:text-ink transition-colors"
              onClick={() => setIsRegister((prev) => !prev)}
            >
              {isRegister ? (
                <>Already have an account? <span className="font-semibold text-primary-600">Sign in</span></>
              ) : (
                <>Need an account? <span className="font-semibold text-primary-600">Register</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
