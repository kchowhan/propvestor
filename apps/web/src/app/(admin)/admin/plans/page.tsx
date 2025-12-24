'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AdminPlans() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => apiFetch('/admin/plans', { token }),
    retry: false,
    enabled: !!token,
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiFetch(`/admin/plans/${id}`, { token, method: 'PATCH', body: updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      setEditingPlan(null);
    },
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Subscription Plans</h1>
        <Link href="/admin" className="text-primary-600 hover:underline">
          ← Back to Admin Dashboard
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-600">Loading plans...</div>
      ) : !plans || plans.length === 0 ? (
        <div className="text-center py-8 text-slate-600">No plans found.</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan: any) => (
            <div key={plan.id} className="card">
              <div className="card-header flex items-center justify-between">
                <span>{plan.name}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    plan.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <span className="text-3xl font-bold text-ink">
                    ${Number(plan.price).toFixed(2)}
                  </span>
                  <span className="text-slate-600">/{plan.billingInterval}</span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-1">
                    {plan._count?.subscriptions || 0} active subscriptions
                  </p>
                </div>

                {/* Limits */}
                <div className="mb-4 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Limits</h4>
                  <ul className="space-y-1 text-sm">
                    {Object.entries(plan.limits || {}).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex justify-between">
                        <span className="text-slate-600 capitalize">{key}</span>
                        <span className="font-medium text-ink">
                          {value === 999999 ? '∞' : value.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features */}
                <div className="mb-4 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Features</h4>
                  <ul className="space-y-1 text-sm">
                    {Object.entries(plan.features || {}).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex items-center gap-2">
                        {value ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-slate-400">✗</span>
                        )}
                        <span className={value ? 'text-slate-700' : 'text-slate-400'}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stripe Info */}
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs text-slate-500">
                    Stripe Price ID:{' '}
                    {plan.stripePriceId ? (
                      <span className="font-mono">{plan.stripePriceId}</span>
                    ) : (
                      <span className="text-yellow-600">Not configured</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => setEditingPlan(plan)}
                  className="mt-4 w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-ink mb-4">Edit Plan: {editingPlan.name}</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updates: any = {
                  name: formData.get('name'),
                  price: parseFloat(formData.get('price') as string),
                  isActive: formData.get('isActive') === 'true',
                  stripePriceId: formData.get('stripePriceId') || null,
                };
                updatePlan.mutate({ id: editingPlan.id, updates });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingPlan.name}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price ($/month)
                </label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={Number(editingPlan.price)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  name="isActive"
                  defaultValue={editingPlan.isActive ? 'true' : 'false'}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Stripe Price ID
                </label>
                <input
                  name="stripePriceId"
                  type="text"
                  defaultValue={editingPlan.stripePriceId || ''}
                  placeholder="price_..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get this from your Stripe Dashboard → Products
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePlan.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {updatePlan.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

