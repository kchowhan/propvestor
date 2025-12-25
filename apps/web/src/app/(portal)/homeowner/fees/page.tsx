'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomeownerFeesPage() {
  const { token, homeowner, association, logout } = useHomeownerAuth();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['homeowner-fees'],
    queryFn: () => apiFetch('/homeowner-portal/fees', { token }),
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
        <div className="text-red-600">Failed to load fees.</div>
      </div>
    );
  }

  const fees = data?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PARTIALLY_PAID':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MONTHLY_DUES':
        return 'Monthly Dues';
      case 'SPECIAL_ASSESSMENT':
        return 'Special Assessment';
      case 'LATE_FEE':
        return 'Late Fee';
      case 'VIOLATION_FEE':
        return 'Violation Fee';
      case 'TRANSFER_FEE':
        return 'Transfer Fee';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink mb-2">HOA Fees</h2>
          <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        {fees.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <p className="text-slate-600">No fees found.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {fees.map((fee: any) => (
              <div key={fee.id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-ink">{getTypeLabel(fee.type)}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(fee.status)}`}>
                          {fee.status}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-2">{fee.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Amount:</span>
                          <p className="font-semibold">${Number(fee.amount).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Due Date:</span>
                          <p className="font-semibold">{format(new Date(fee.dueDate), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Paid:</span>
                          <p className="font-semibold text-green-600">${Number(fee.paidAmount || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Remaining:</span>
                          <p className={`font-semibold ${fee.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${Number(fee.remainingAmount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {fee.lateFeeAmount && fee.lateFeeApplied && (
                        <div className="mt-2 text-sm text-red-600">
                          Late fee applied: ${Number(fee.lateFeeAmount).toFixed(2)}
                        </div>
                      )}
                    </div>
                    {fee.remainingAmount > 0 && (
                      <div className="ml-4">
                        <Link
                          href={`/homeowner/pay/${fee.id}`}
                          className="btn btn-primary"
                        >
                          Pay Now
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

