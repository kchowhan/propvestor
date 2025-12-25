'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

// Grayscale SVG Icons
const DashboardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const PropertiesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const TenantsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const LeasesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BillingIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MaintenanceIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SubscriptionIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const AdminIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const HOAIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/properties', label: 'Properties', icon: PropertiesIcon },
  { to: '/tenants', label: 'Tenants & Applicants', icon: TenantsIcon },
  { to: '/leases', label: 'Leases', icon: LeasesIcon },
  { to: '/billing', label: 'Billing / Rent Roll', icon: BillingIcon },
  { to: '/maintenance', label: 'Maintenance', icon: MaintenanceIcon },
  { to: '/subscription', label: 'Subscription', icon: SubscriptionIcon },
];

const hoaNavItems = [
  { to: '/associations', label: 'Associations', icon: HOAIcon },
  { to: '/homeowners', label: 'Homeowners', icon: TenantsIcon },
  { to: '/board-members', label: 'Board Members', icon: UsersIcon },
  { to: '/violations', label: 'Violations', icon: MaintenanceIcon },
];

export const Sidebar = memo(() => {
  const { currentRole, user } = useAuth();
  const pathname = usePathname();
  
  const canManageUsers = useMemo(
    () => currentRole === 'OWNER' || currentRole === 'ADMIN',
    [currentRole]
  );

  const isSuperAdmin = user?.isSuperAdmin === true;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(path) ?? false;
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200/60 min-h-screen shadow-soft">
      <div className="p-6 border-b border-slate-200/60">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
        >
          <Logo className="h-10 w-auto" />
          <div className="text-xl font-bold text-ink">
            PropVestor
          </div>
        </Link>
      </div>
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
              }`}
            >
              <IconComponent className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {canManageUsers && (
          <Link
            href="/users"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive('/users')
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
            }`}
          >
            <UsersIcon className={`w-5 h-5 flex-shrink-0 ${isActive('/users') ? 'text-white' : 'text-slate-500'}`} />
            <span>User Management</span>
          </Link>
        )}

        {/* HOA Management Section */}
        <div className="pt-4 mt-4 border-t border-slate-200">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            HOA Management
          </div>
          {hoaNavItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
                }`}
              >
                <IconComponent className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        {/* Admin Dashboard - only for Super Admins */}
        {isSuperAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-200">
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                pathname?.startsWith('/admin')
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'text-purple-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <AdminIcon className={`w-5 h-5 flex-shrink-0 ${pathname?.startsWith('/admin') ? 'text-white' : 'text-purple-500'}`} />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
