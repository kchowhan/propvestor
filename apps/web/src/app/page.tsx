'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';

export default function Home() {
  const router = useRouter();
  const { token: pmToken, loading: pmLoading } = useAuth();
  const { token: hoToken, loading: hoLoading } = useHomeownerAuth();

  useEffect(() => {
    if (!pmLoading && !hoLoading) {
      if (pmToken) {
        router.replace('/dashboard');
      } else if (hoToken) {
        router.replace('/homeowner/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [pmToken, hoToken, pmLoading, hoLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-600">Loading...</div>
    </div>
  );
}

