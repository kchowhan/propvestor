'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminOrganizationDetail() {
  const { token } = useAuth();
  const params = useParams();
  const queryClient = useQueryClient();
  const orgId = params.id as string;

  const [extendTrialDays, setExtendTrialDays] = useState('14');
  const [showExtendModal, setShowExtendModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'organizations', orgId],
    queryFn: () => apiFetch(`/admin/organizations/${orgId}`, { token }),
    retry: false,
  });

  const updateOrg = useMutation({
    mutationFn: (updates: any) =>
      apiFetch(`/admin/organizations/${orgId}`, { token, method: 'PATCH', body: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations', orgId] });
      setShowExtendModal(false);
    },
  });

  const suspend = useMutation({
    mutationFn: () => apiFetch(`/admin/organizations/${orgId}/suspend`, { token, method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'organizations', orgId] }),
  });

  const reactivate = useMutation({
    mutationFn: () => apiFetch(`/admin/organizations/${orgId}/reactivate`, { token, method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'organizations', orgId] }),
  });

  const org = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading organization details...</div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-600 mb-4">Could not load organization details.</p>
        {error && (
          <div className="bg-white rounded p-4 mb-4 text-left">
            <p className="text-sm font-mono text-red-700">
              {(error as any)?.message || JSON.stringify(error)}
            </p>
          </div>
        )}
        <div className="text-left bg-white rounded p-4 mb-4 text-sm">
          <p className="font-semibold text-slate-700 mb-2">Debug Info:</p>
          <p className="text-slate-600">Organization ID: <code className="bg-slate-100 px-1 rounded">{orgId}</code></p>
          <p className="text-slate-600">Token present: {token ? 'Yes' : 'No'}</p>
          <p className="text-slate-600">API URL: <code className="bg-slate-100 px-1 rounded">GET /api/admin/organizations/{orgId}</code></p>
        </div>
        <Link href="/admin/organizations" className="inline-block text-red-700 underline">
          ← Back to Organizations
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    TRIAL: 'bg-blue-100 text-blue-800',
    PAST_DUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/organizations" className="text-primary-600 hover:underline text-sm">
            ← Back to Organizations
          </Link>
          <h1 className="text-3xl font-bold text-ink mt-2">{org.name}</h1>
        </div>
        <div className="flex gap-3">
          {org.subscription?.status !== 'CANCELLED' && org.subscription?.status !== 'EXPIRED' ? (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to suspend ${org.name}?`)) {
                  suspend.mutate();
                }
              }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              disabled={suspend.isPending}
            >
              Suspend Organization
            </button>
          ) : (
            <button
              onClick={() => reactivate.mutate()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={reactivate.isPending}
            >
              Reactivate Organization
            </button>
          )}
        </div>
      </div>

      {/* Subscription Info */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span>Subscription</span>
          {org.subscription?.status === 'TRIAL' && (
            <button
              onClick={() => setShowExtendModal(true)}
              className="text-sm text-primary-600 hover:underline"
            >
              Extend Trial
            </button>
          )}
        </div>
        <div className="card-body">
          {org.subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-ink">{org.subscription.plan?.name}</h3>
                  <p className="text-slate-600">
                    ${Number(org.subscription.plan?.price || 0).toFixed(2)}/
                    {org.subscription.plan?.billingInterval}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[org.subscription.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {org.subscription.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-sm text-slate-600">Current Period</p>
                  <p className="font-medium text-ink">
                    {format(new Date(org.subscription.currentPeriodStart), 'MMM d')} -{' '}
                    {format(new Date(org.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </p>
                </div>
                {org.subscription.trialEndsAt && (
                  <div>
                    <p className="text-sm text-slate-600">Trial Ends</p>
                    <p className="font-medium text-ink">
                      {format(new Date(org.subscription.trialEndsAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Invoices */}
              {org.subscription.invoices?.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="font-semibold text-ink mb-3">Recent Invoices</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-slate-600">
                        <tr>
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Amount</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {org.subscription.invoices.map((invoice: any) => (
                          <tr key={invoice.id}>
                            <td className="py-2">
                              {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                            </td>
                            <td className="py-2">${Number(invoice.amount).toFixed(2)}</td>
                            <td className="py-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  invoice.status === 'PAID'
                                    ? 'bg-green-100 text-green-800'
                                    : invoice.status === 'FAILED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-600">No subscription</p>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="card">
        <div className="card-header">Usage</div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-3xl font-bold text-ink">{org._count?.properties || 0}</p>
              <p className="text-sm text-slate-600">Properties</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-ink">{org._count?.tenants || 0}</p>
              <p className="text-sm text-slate-600">Tenants</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-ink">{org._count?.leases || 0}</p>
              <p className="text-sm text-slate-600">Leases</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-ink">{org._count?.workOrders || 0}</p>
              <p className="text-sm text-slate-600">Work Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <div className="card-header">Members ({org.memberships?.length || 0})</div>
        <div className="card-body p-0">
          {org.memberships?.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {org.memberships.map((membership: any) => (
                  <tr key={membership.id}>
                    <td className="px-4 py-3">{membership.user?.name}</td>
                    <td className="px-4 py-3">{membership.user?.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {membership.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-slate-600">No members</p>
          )}
        </div>
      </div>

      {/* Extend Trial Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-ink mb-4">Extend Trial Period</h3>
            <p className="text-slate-600 mb-4">
              Extend the trial period for {org.name}. The trial will be extended by the number of days
              you specify from the current trial end date (or today if already expired).
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Days to Extend
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={extendTrialDays}
                onChange={(e) => setExtendTrialDays(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateOrg.mutate({ extendTrial: parseInt(extendTrialDays) })}
                disabled={updateOrg.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {updateOrg.isPending ? 'Extending...' : 'Extend Trial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

