'use client';

import { useQuery } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomeownerDashboardPage() {
  const { token, homeowner, association, logout } = useHomeownerAuth();
  const router = useRouter();

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
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">Homeowner Portal</h1>
              <p className="text-sm text-slate-600">{association?.name}</p>
            </div>
            <div className="flex items-center gap-4">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Account Balance Card */}
          <div className="card">
            <div className="card-header">Account Balance</div>
            <div className="card-body">
              <div className="text-3xl font-bold text-ink">
                ${Number(dashboardData?.homeowner?.accountBalance || 0).toFixed(2)}
              </div>
              <p className="text-sm text-slate-600 mt-2">Current balance owed</p>
              <Link href="/homeowner/balance" className="btn btn-primary mt-4 w-full">
                View Details
              </Link>
            </div>
          </div>

          {/* Association Info Card */}
          <div className="card">
            <div className="card-header">Association Information</div>
            <div className="card-body">
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

          {/* Unit/Property Info Card */}
          {(dashboardData?.unit || dashboardData?.property) && (
            <div className="card">
              <div className="card-header">Your Property</div>
              <div className="card-body">
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
          )}

          {/* Documents Card */}
          <div className="card">
            <div className="card-header">Documents</div>
            <div className="card-body">
              <p className="text-sm text-slate-600">View association documents and files</p>
              <Link href="/homeowner/documents" className="btn btn-primary mt-4 w-full">
                View Documents
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 card">
          <div className="card-header">Quick Actions</div>
          <div className="card-body">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <button className="btn btn-secondary" disabled>
                Submit Maintenance Request
                <span className="text-xs text-slate-500 ml-2">(Coming Soon)</span>
              </button>
              <button className="btn btn-secondary" disabled>
                Make Payment
                <span className="text-xs text-slate-500 ml-2">(Coming Soon)</span>
              </button>
              <button className="btn btn-secondary" disabled>
                View Violations
                <span className="text-xs text-slate-500 ml-2">(Coming Soon)</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

