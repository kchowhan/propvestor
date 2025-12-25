'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomeownerAuthProvider, useHomeownerAuth } from '@/context/HomeownerAuthContext';

function HomeownerPageContent() {
  const router = useRouter();
  const { token, loading } = useHomeownerAuth();

  useEffect(() => {
    if (!loading) {
      if (token) {
        router.replace('/homeowner/dashboard');
      } else {
        router.replace('/homeowner/login');
      }
    }
  }, [token, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-600">Loading...</div>
    </div>
  );
}

export default function HomeownerPage() {
  return (
    <HomeownerAuthProvider>
      <HomeownerPageContent />
    </HomeownerAuthProvider>
  );
}
