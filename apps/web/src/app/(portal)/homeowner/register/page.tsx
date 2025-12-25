'use client';

import { useState } from 'react';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function HomeownerRegisterPage() {
  const { register } = useHomeownerAuth();
  const [form, setForm] = useState({
    associationId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    unitId: '',
    propertyId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      await register({
        associationId: form.associationId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        unitId: form.unitId || undefined,
        propertyId: form.propertyId || undefined,
      });
      setSuccess(true);
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
            A verification email has been sent to <strong>{form.email}</strong>.
            Please check your email to verify your account before logging in.
          </p>
          <Link href="/homeowner/login" className="btn btn-primary mt-6">
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
            <p className="text-sm text-slate-600">Homeowner Portal Registration</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="associationId" className="label">
                Association ID <span className="text-red-500">*</span>
              </label>
              <input
                id="associationId"
                className="input"
                type="text"
                value={form.associationId}
                onChange={(e) => setForm((prev) => ({ ...prev, associationId: e.target.value }))}
                placeholder="Enter your association ID"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Contact your association administrator if you don't have this
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  className="input"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="label">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  className="input"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
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
              <label htmlFor="phone" className="label">
                Phone
              </label>
              <input
                id="phone"
                className="input"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
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
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
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
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="unitId" className="label">
                Unit ID (Optional)
              </label>
              <input
                id="unitId"
                className="input"
                type="text"
                value={form.unitId}
                onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value }))}
                placeholder="If you own a specific unit"
              />
            </div>

            <div>
              <label htmlFor="propertyId" className="label">
                Property ID (Optional)
              </label>
              <input
                id="propertyId"
                className="input"
                type="text"
                value={form.propertyId}
                onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                placeholder="If you own a property"
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
                  <span>Registering...</span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/homeowner/login" className="text-primary-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

