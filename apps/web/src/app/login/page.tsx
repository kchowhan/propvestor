'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/pages/Login';

export default function Login() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (!loading && token) {
      router.replace('/dashboard');
    }
  }, [token, loading, router]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // If authenticated, don't render login page (will redirect)
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Redirecting...</div>
      </div>
    );
  }

  return <LoginPage />;
}

