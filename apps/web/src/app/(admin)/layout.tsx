'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!user.isSuperAdmin) {
        // Not a super admin, redirect to dashboard
        router.push('/dashboard');
      }
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user || !user.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Redirecting...</div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/organizations', label: 'Organizations' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/plans', label: 'Plans' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-purple-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-2xl font-bold">
                PropVestor Admin
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-700 text-white'
                          : 'text-purple-200 hover:bg-purple-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-purple-200 hover:text-white text-sm"
              >
                Exit Admin →
              </Link>
              <div className="text-sm text-purple-200">
                {user.name}
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-purple-800 px-4 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                isActive
                  ? 'bg-purple-700 text-white'
                  : 'text-purple-200 hover:bg-purple-700 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

