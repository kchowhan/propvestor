'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomeownerAuthProvider, useHomeownerAuth } from '../../../context/HomeownerAuthContext';

function PortalLayoutContent({ children }: { children: React.ReactNode }) {
  const { token, loading } = useHomeownerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push('/homeowner/login');
    }
  }, [token, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
}

export default function HomeownerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <HomeownerAuthProvider>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </HomeownerAuthProvider>
  );
}

