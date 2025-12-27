'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { HomeownerAuthProvider, useHomeownerAuth } from '../../../context/HomeownerAuthContext';
import { useAuth } from '../../../context/AuthContext';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/homeowner/login', '/homeowner/register'];

function PortalLayoutContent({ children }: { children: ReactNode }) {
  const { token: hoToken, loading: hoLoading } = useHomeownerAuth();
  const { token: pmToken, user, loading: pmLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '');
  const isSuperAdmin = user?.isSuperAdmin;
  // Allow access if homeowner auth OR super admin with property manager auth
  const hasAccess = hoToken || (pmToken && isSuperAdmin);
  const loading = hoLoading || pmLoading;

  useEffect(() => {
    // Only protect non-public routes
    if (!isPublicRoute && !loading && !hasAccess) {
      router.push('/homeowner/login');
    }
  }, [hasAccess, loading, router, isPublicRoute]);

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

  if (!hasAccess) {
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

