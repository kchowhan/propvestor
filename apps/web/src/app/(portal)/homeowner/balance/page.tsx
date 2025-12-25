'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import Link from 'next/link';
import { HomeownerPortalHeader } from '@/components/HomeownerPortalHeader';

export default function HomeownerBalancePage() {
  const { token } = useHomeownerAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['homeowner-balance'],
    queryFn: () => apiFetch('/homeowner-portal/balance', { token }),
    enabled: Boolean(token),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Failed to load balance information.</div>
      </div>
    );
  }

  const balanceData = data?.data;
  const balance = Number(balanceData?.accountBalance || 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeownerPortalHeader />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink mb-2">Account Balance</h2>
          <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="card">
          <div className="card-header">Current Balance</div>
          <div className="card-body">
            <div className="text-center py-8">
              <div className={`text-5xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${balance.toFixed(2)}
              </div>
              <p className="text-slate-600 mt-4">
                {balance > 0 ? 'Amount owed to association' : balance < 0 ? 'Credit balance' : 'Account is current'}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-ink mb-4">Account Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name:</span>
                    <span className="font-medium">{balanceData?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Email:</span>
                    <span className="font-medium">{balanceData?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <span className={`font-medium ${
                      balanceData?.status === 'DELINQUENT' ? 'text-red-600' : 
                      balanceData?.status === 'ACTIVE' ? 'text-green-600' : 
                      'text-slate-600'
                    }`}>
                      {balanceData?.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-ink mb-4">Payment History</h3>
                <p className="text-sm text-slate-600">Payment history will be available here.</p>
                <button className="btn btn-secondary mt-4" disabled>
                  Make Payment
                  <span className="text-xs text-slate-500 ml-2">(Coming Soon)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

