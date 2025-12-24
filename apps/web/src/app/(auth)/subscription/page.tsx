'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function SubscriptionPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: () => apiFetch('/subscriptions/current', { token }),
  });

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: () => apiFetch('/subscriptions/plans', { token }),
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['subscription', 'invoices'],
    queryFn: () => apiFetch('/subscriptions/invoices', { token }),
    enabled: !!subscription,
  });

  // Fetch limits
  const { data: limits } = useQuery({
    queryKey: ['subscription', 'limits'],
    queryFn: () => apiFetch('/subscriptions/limits', { token }),
  });

  // Fetch usage counts
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiFetch('/tenants', { token }),
  });
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch('/users', { token }),
  });

  const plansList = plans || [];
  const invoicesList = invoices || [];
  const limitsData = limits || {};
  
  // Calculate usage
  const usage = {
    propertiesUsed: properties?.length || 0,
    tenantsUsed: tenants?.length || 0,
    usersUsed: users?.length || 0,
    storageUsed: 0, // Would need to fetch documents and calculate
  };

  // Subscribe mutation
  const subscribe = useMutation({
    mutationFn: (planId: string) =>
      apiFetch('/subscriptions/subscribe', {
        token,
        method: 'POST',
        body: { planId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'limits'] });
    },
  });

  // Upgrade mutation
  const upgrade = useMutation({
    mutationFn: (planId: string) =>
      apiFetch('/subscriptions/upgrade', {
        token,
        method: 'POST',
        body: { planId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'limits'] });
    },
  });

  // Cancel mutation
  const cancel = useMutation({
    mutationFn: () =>
      apiFetch('/subscriptions/cancel', {
        token,
        method: 'POST',
        body: { cancelAtPeriodEnd },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowCancelConfirm(false);
    },
  });

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading subscription information...</div>
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const statusColors: Record<string, string> = {
    TRIAL: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
    PAST_DUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Subscription Management</h1>
      </div>

      {/* Current Subscription */}
      <div className="card">
        <div className="card-header">Current Subscription</div>
        <div className="card-body">
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-ink">{currentPlan?.name || 'Unknown Plan'}</h3>
                  <p className="text-slate-600 mt-1">
                    ${Number(currentPlan?.price || 0).toFixed(2)}/{currentPlan?.billingInterval || 'month'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    statusColors[subscription.status] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {subscription.status}
                </span>
              </div>

              {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Trial ends:</strong> {format(new Date(subscription.trialEndsAt), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-sm text-slate-600">Current Period</p>
                  <p className="font-medium text-ink">
                    {format(new Date(subscription.currentPeriodStart), 'MMM d')} -{' '}
                    {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </p>
                </div>
                {subscription.cancelAtPeriodEnd && (
                  <div>
                    <p className="text-sm text-red-600">Cancellation Scheduled</p>
                    <p className="font-medium text-red-600">
                      Will cancel on {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              {/* Usage Limits */}
              {limitsData && (
                <div className="pt-4 border-t border-slate-200">
                  <h4 className="font-semibold text-ink mb-3">Current Usage</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Properties</p>
                      <p className="font-medium text-ink">
                        {usage.propertiesUsed} / {limitsData.properties === 999999 ? '∞' : limitsData.properties}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Tenants</p>
                      <p className="font-medium text-ink">
                        {usage.tenantsUsed} / {limitsData.tenants === 999999 ? '∞' : limitsData.tenants}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Users</p>
                      <p className="font-medium text-ink">
                        {usage.usersUsed} / {limitsData.users === 999999 ? '∞' : limitsData.users}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Storage</p>
                      <p className="font-medium text-ink">
                        {usage.storageUsed} MB / {limitsData.storage === 999999 ? '∞' : `${limitsData.storage} MB`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {subscription.status !== 'CANCELLED' && subscription.status !== 'EXPIRED' && (
                  <>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="rounded-lg border border-red-300 text-red-600 px-4 py-2 hover:bg-red-50 transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  </>
                )}
                {subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED' ? (
                  <a
                    href="/pricing"
                    className="rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90 transition-colors inline-block"
                  >
                    Subscribe to a Plan
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">You don't have an active subscription.</p>
              <a
                href="/pricing"
                className="rounded-lg bg-ink text-white px-6 py-3 hover:bg-ink/90 transition-colors inline-block"
              >
                View Plans
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Available Plans */}
      {!subscription || subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED' ? (
        <div className="card">
          <div className="card-header">Available Plans</div>
          <div className="card-body">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plansList.map((plan: any) => (
                <div
                  key={plan.id}
                  className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-bold text-ink mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-ink">${Number(plan.price).toFixed(2)}</span>
                    <span className="text-slate-600">/{plan.billingInterval}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {Object.entries(plan.features || {}).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        {value ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-slate-400">✗</span>
                        )}
                        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => subscribe.mutate(plan.id)}
                    disabled={subscribe.isPending}
                    className="w-full rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90 transition-colors disabled:opacity-50"
                  >
                    {subscribe.isPending ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">Upgrade Plan</div>
          <div className="card-body">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plansList
                .filter((plan: any) => plan.id !== currentPlan?.id)
                .map((plan: any) => (
                  <div
                    key={plan.id}
                    className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-xl font-bold text-ink mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-ink">${Number(plan.price).toFixed(2)}</span>
                      <span className="text-slate-600">/{plan.billingInterval}</span>
                    </div>
                    <button
                      onClick={() => upgrade.mutate(plan.id)}
                      disabled={upgrade.isPending}
                      className="w-full rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90 transition-colors disabled:opacity-50"
                    >
                      {upgrade.isPending ? 'Upgrading...' : 'Upgrade'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoices */}
      {subscription && invoicesList.length > 0 && (
        <div className="card">
          <div className="card-header">Invoices</div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="pb-2 px-3">Date</th>
                    <th className="pb-2 px-3">Amount</th>
                    <th className="pb-2 px-3">Status</th>
                    <th className="pb-2 px-3">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesList.map((invoice: any) => (
                    <tr key={invoice.id} className="border-t border-slate-100">
                      <td className="py-2 px-3">{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</td>
                      <td className="py-2 px-3">${Number(invoice.amount).toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
                      <td className="py-2 px-3">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-ink mb-4">Cancel Subscription</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to cancel your subscription? You can choose to cancel immediately or at the end of
              your current billing period.
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(true)}
                  className="text-ink"
                />
                <span>Cancel at end of period ({format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')})</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(false)}
                  className="text-ink"
                />
                <span>Cancel immediately</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-lg border border-slate-300 text-slate-700 px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="flex-1 rounded-lg bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancel.isPending ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

