'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LeasesPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'create' | 'leases'>('create');
  const [form, setForm] = useState({
    unitId: '',
    tenantIds: [] as string[],
    primaryTenantId: '',
    startDate: '',
    endDate: '',
    rentAmount: '',
    rentDueDay: '1',
  });

  const leasesQuery = useQuery({
    queryKey: ['leases'],
    queryFn: () => apiFetch('/leases', { token }),
  });

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiFetch('/tenants', { token }),
  });

  const createLease = useMutation({
    mutationFn: () =>
      apiFetch('/leases', {
        token,
        method: 'POST',
        body: {
          unitId: form.unitId,
          tenantIds: form.tenantIds,
          primaryTenantId: form.primaryTenantId || form.tenantIds[0] || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          rentAmount: Number(form.rentAmount),
          rentDueDay: Number(form.rentDueDay),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setForm({ unitId: '', tenantIds: [], primaryTenantId: '', startDate: '', endDate: '', rentAmount: '', rentDueDay: '1' });
    },
  });

  if (leasesQuery.isLoading) {
    return <div>Loading leases...</div>;
  }

  if (leasesQuery.error) {
    return <div className="text-red-600">Failed to load leases.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Create Lease
          </button>
          <button
            onClick={() => setActiveTab('leases')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'leases'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Leases
          </button>
        </nav>
      </div>

      {/* Create Lease Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header">Create Lease</div>
          <div className="card-body space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={form.unitId}
              onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value }))}
              required
            >
              <option value="">Select unit</option>
              {propertiesQuery.data?.flatMap((property: any) =>
                property.units.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {property.name} - {unit.name}
                  </option>
                )),
              )}
            </select>
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              required
            />
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Rent amount"
              value={form.rentAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, rentAmount: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Rent due day"
              value={form.rentDueDay}
              onChange={(e) => setForm((prev) => ({ ...prev, rentDueDay: e.target.value }))}
              required
            />
            <button
              className="rounded-lg bg-ink text-white px-3 py-2"
              onClick={() => createLease.mutate()}
            >
              Create Lease
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Tenants (Select Multiple)</label>
              <select
                multiple
                className="w-full rounded-lg border border-slate-200 px-3 py-2 h-32"
                value={form.tenantIds}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                  setForm((prev) => ({
                    ...prev,
                    tenantIds: selectedIds,
                    // Auto-select first tenant as primary if none selected
                    primaryTenantId: prev.primaryTenantId || selectedIds[0] || '',
                  }));
                }}
              >
                {tenantsQuery.data?.map((tenant: any) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Hold Cmd/Ctrl to select multiple tenants</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Primary Tenant</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.primaryTenantId}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryTenantId: e.target.value }))}
                disabled={form.tenantIds.length === 0}
              >
                <option value="">Select primary tenant</option>
                {form.tenantIds.map((tenantId) => {
                  const tenant = tenantsQuery.data?.find((t: any) => t.id === tenantId);
                  return tenant ? (
                    <option key={tenantId} value={tenantId}>
                      {tenant.firstName} {tenant.lastName}
                    </option>
                  ) : null;
                })}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Primary tenant is responsible for rent payments and communications
              </p>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Leases Tab */}
      {activeTab === 'leases' && (
        <div className="card">
          <div className="card-header">Leases</div>
          <div className="card-body">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="pb-2">Unit</th>
                <th className="pb-2">Tenants</th>
                <th className="pb-2">Rent</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leasesQuery.data?.map((lease: any) => (
                <tr key={lease.id} className="border-t border-slate-100">
                  <td className="py-2">
                    <Link className="underline" href={`/leases/${lease.id}`}>
                      {lease.unit?.property?.name} - {lease.unit?.name}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-600">
                    {lease.tenants?.map((lt: any) => lt.tenant.firstName).join(', ')}
                  </td>
                  <td className="py-2 text-slate-600">${Number(lease.rentAmount).toFixed(2)}</td>
                  <td className="py-2 text-slate-600">{lease.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};
