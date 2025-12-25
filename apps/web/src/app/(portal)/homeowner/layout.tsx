'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HomeownerAuthProvider, useHomeownerAuth } from '../../../context/HomeownerAuthContext';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/homeowner/login', '/homeowner/register'];

function PortalLayoutContent({ children }: { children: ReactNode }) {
  const { token, loading } = useHomeownerAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '');

  useEffect(() => {
    // Only protect non-public routes
    if (!isPublicRoute && !loading && !token) {
      router.push('/homeowner/login');
    }
  }, [token, loading, router, isPublicRoute]);

  // For public routes, always render children
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, check auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!token) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

export default function HomeownerPortalLayout({ children }: { children: ReactNode }) {
  return (
    <HomeownerAuthProvider>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </HomeownerAuthProvider>
  );
}

