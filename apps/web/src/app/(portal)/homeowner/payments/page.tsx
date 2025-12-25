'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomeownerPaymentsPage() {
  const { token, homeowner, association, logout } = useHomeownerAuth();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['homeowner-payments'],
    queryFn: () => apiFetch('/homeowner-portal/payments', { token }),
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
        <div className="text-red-600">Failed to load payments.</div>
      </div>
    );
  }

  const payments = data?.data || [];

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'STRIPE_CARD':
        return 'Credit Card';
      case 'STRIPE_ACH':
        return 'Bank Account';
      case 'STRIPE_BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CHECK':
        return 'Check';
      case 'CASH':
        return 'Cash';
      default:
        return method;
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
          <h2 className="text-2xl font-bold text-ink mb-2">Payment History</h2>
          <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        {payments.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <p className="text-slate-600">No payments found.</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-semibold text-slate-700">Date</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Fee</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Amount</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Method</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 text-slate-600">
                          {format(new Date(payment.receivedDate), 'MMM d, yyyy')}
                        </td>
                        <td className="py-2">
                          {payment.hoaFee ? (
                            <div>
                              <div className="font-medium">{payment.hoaFee.description}</div>
                              <div className="text-xs text-slate-500">{payment.hoaFee.type}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 font-semibold">${Number(payment.amount).toFixed(2)}</td>
                        <td className="py-2 text-slate-600">
                          <div>
                            {getMethodLabel(payment.method)}
                            {payment.paymentMethod && (
                              <div className="text-xs text-slate-500">
                                {payment.paymentMethod.cardBrand && `${payment.paymentMethod.cardBrand} `}
                                {payment.paymentMethod.last4 && `••••${payment.paymentMethod.last4}`}
                                {payment.paymentMethod.bankName && payment.paymentMethod.bankName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-slate-500 text-sm">
                          {payment.reference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

