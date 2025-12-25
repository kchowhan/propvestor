'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import Link from 'next/link';
import { HomeownerPortalHeader } from '@/components/HomeownerPortalHeader';

export default function HomeownerDashboardPage() {
  const { token } = useHomeownerAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['homeowner-dashboard'],
    queryFn: () => apiFetch('/homeowner-portal/dashboard', { token }),
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
        <div className="text-red-600">Failed to load dashboard.</div>
      </div>
    );
  }

  const dashboardData = data?.data;

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeownerPortalHeader />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Link href="/homeowner/fees" className="card hover:shadow-lg transition-shadow">
            <div className="card-body text-center">
              <div className="text-3xl font-bold text-primary-600">
                {dashboardData?.pendingFees?.length || 0}
              </div>
              <div className="text-sm text-slate-600 mt-1">Pending Fees</div>
            </div>
          </Link>
          <Link href="/homeowner/payments" className="card hover:shadow-lg transition-shadow">
            <div className="card-body text-center">
              <div className="text-3xl font-bold text-primary-600">
                {dashboardData?.recentPayments?.length || 0}
              </div>
              <div className="text-sm text-slate-600 mt-1">Recent Payments</div>
            </div>
          </Link>
          <Link href="/homeowner/balance" className="card hover:shadow-lg transition-shadow">
            <div className="card-body text-center">
              <div className="text-3xl font-bold text-primary-600">
                ${Number(dashboardData?.homeowner?.accountBalance || 0).toFixed(2)}
              </div>
              <div className="text-sm text-slate-600 mt-1">Account Balance</div>
            </div>
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Account Balance Card */}
          <div className="card flex flex-col">
            <div className="card-header">Account Balance</div>
            <div className="card-body flex flex-col flex-grow">
              <div className="flex-grow">
                <div className="text-3xl font-bold text-ink">
                  ${Number(dashboardData?.homeowner?.accountBalance || 0).toFixed(2)}
                </div>
                <p className="text-sm text-slate-600 mt-2">Current balance owed</p>
              </div>
              <Link href="/homeowner/balance" className="btn btn-primary mt-4 w-full">
                View Details
              </Link>
            </div>
          </div>

          {/* Association Info Card */}
          <div className="card flex flex-col">
            <div className="card-header">Association Information</div>
            <div className="card-body flex flex-col flex-grow">
              <div className="flex-grow">
                <h3 className="font-semibold text-ink">{dashboardData?.association?.name}</h3>
                {dashboardData?.association?.addressLine1 && (
                  <p className="text-sm text-slate-600 mt-2">
                    {dashboardData.association.addressLine1}
                    {dashboardData.association.city && `, ${dashboardData.association.city}`}
                    {dashboardData.association.state && `, ${dashboardData.association.state}`}
                  </p>
                )}
                {dashboardData?.association?.phone && (
                  <p className="text-sm text-slate-600 mt-1">Phone: {dashboardData.association.phone}</p>
                )}
                {dashboardData?.association?.email && (
                  <p className="text-sm text-slate-600 mt-1">Email: {dashboardData.association.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Unit/Property Info Card */}
          {(dashboardData?.unit || dashboardData?.property) && (
            <div className="card flex flex-col">
              <div className="card-header">Your Property</div>
              <div className="card-body flex flex-col flex-grow">
                <div className="flex-grow">
                  {dashboardData?.unit ? (
                    <>
                      <h3 className="font-semibold text-ink">{dashboardData.unit.name}</h3>
                      <p className="text-sm text-slate-600 mt-2">
                        {dashboardData.unit.property?.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {dashboardData.unit.property?.addressLine1}
                        {dashboardData.unit.property?.city && `, ${dashboardData.unit.property.city}`}
                        {dashboardData.unit.property?.state && `, ${dashboardData.unit.property.state}`}
                      </p>
                    </>
                  ) : dashboardData?.property ? (
                    <>
                      <h3 className="font-semibold text-ink">{dashboardData.property.name}</h3>
                      <p className="text-sm text-slate-600 mt-2">
                        {dashboardData.property.addressLine1}
                        {dashboardData.property.city && `, ${dashboardData.property.city}`}
                        {dashboardData.property.state && `, ${dashboardData.property.state}`}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Documents Card */}
          <div className="card flex flex-col">
            <div className="card-header">Documents</div>
            <div className="card-body flex flex-col flex-grow">
              <div className="flex-grow">
                <p className="text-sm text-slate-600">View association documents and files</p>
              </div>
              <Link href="/homeowner/documents" className="btn btn-primary mt-4 w-full">
                View Documents
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Fees */}
        {dashboardData?.pendingFees && dashboardData.pendingFees.length > 0 && (
          <div className="mt-8 card">
            <div className="card-header flex items-center justify-between">
              <span>Pending Fees</span>
              <Link href="/homeowner/fees" className="text-primary-600 hover:underline text-sm">
                View All →
              </Link>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {dashboardData.pendingFees.slice(0, 3).map((fee: any) => (
                  <div key={fee.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">{fee.description}</div>
                      <div className="text-sm text-slate-600">
                        Due: {new Date(fee.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${Number(fee.amount).toFixed(2)}</div>
                      <Link
                        href={`/homeowner/pay/${fee.id}`}
                        className="btn btn-sm btn-primary mt-1"
                      >
                        Pay
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Payments */}
        {dashboardData?.recentPayments && dashboardData.recentPayments.length > 0 && (
          <div className="mt-8 card">
            <div className="card-header flex items-center justify-between">
              <span>Recent Payments</span>
              <Link href="/homeowner/payments" className="text-primary-600 hover:underline text-sm">
                View All →
              </Link>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {dashboardData.recentPayments.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {payment.hoaFee?.description || 'Payment'}
                      </div>
                      <div className="text-sm text-slate-600">
                        {new Date(payment.receivedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-semibold text-green-600">
                      ${Number(payment.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 card">
          <div className="card-header">Quick Actions</div>
          <div className="card-body">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/homeowner/fees" className="btn btn-secondary">
                View All Fees
              </Link>
              <Link href="/homeowner/payments" className="btn btn-secondary">
                Payment History
              </Link>
              <Link href="/homeowner/maintenance" className="btn btn-secondary">
                Submit Maintenance Request
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

