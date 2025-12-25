'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';

export function HomeownerPortalHeader() {
  const { homeowner, association, logout } = useHomeownerAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Homeowner Portal</h1>
            <p className="text-sm text-slate-600">{association?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm">
              Dashboard
            </Link>
            <span className="text-sm text-slate-600">
              {homeowner?.firstName} {homeowner?.lastName}
            </span>
            <button
              onClick={() => {
                logout();
                router.push('/homeowner/login');
              }}
              className="btn btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

