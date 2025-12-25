'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const TenantsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'prospects'>('active');
  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '',
    phone: '',
    propertyId: '',
    unitId: '',
  });

  const { data: propertiesResponse } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });

  const { data: tenantsResponse, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiFetch('/tenants', { token }),
  });

  // Extract data arrays from paginated responses
  const properties = propertiesResponse?.data || [];
  const tenants = tenantsResponse?.data || [];

  const createTenant = useMutation({
    mutationFn: () =>
      apiFetch('/tenants', {
        token,
        method: 'POST',
        body: {
          ...form,
          status: 'PROSPECT', // New tenants start as prospects
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setForm({ 
        firstName: '', 
        lastName: '', 
        email: '',
        phone: '',
        propertyId: '',
        unitId: '',
      });
    },
  });

  const _requestScreening = useMutation({
    mutationFn: (tenantId: string) =>
      apiFetch('/screening/request', {
        token,
        method: 'POST',
        body: { tenantId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['screening-requests'] });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load tenants.</div>;
  }

  // Filter tenants by status
  const filteredTenants = tenants?.filter((tenant: any) => {
    if (activeTab === 'active') {
      // Only show ACTIVE tenants with active leases
      return tenant.status === 'ACTIVE' || tenant.leases?.some((lt: any) => lt.lease?.status === 'ACTIVE');
    }
    if (activeTab === 'prospects') {
      // Only show prospects/applicants - exclude ACTIVE tenants
      const hasActiveLease = tenant.leases?.some((lt: any) => lt.lease?.status === 'ACTIVE');
      const isActive = tenant.status === 'ACTIVE';
      // Exclude if they have active lease or are ACTIVE status
      if (hasActiveLease || isActive) {
        return false;
      }
      return ['PROSPECT', 'SCREENING', 'APPROVED', 'DECLINED', 'WITHDRAWN', 'INACTIVE'].includes(tenant.status);
    }
    return false;
  }) || [];

  const tabs = [
    { id: 'active', label: 'Tenants' },
    { id: 'prospects', label: 'Prospects & Applicants' },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="border-b border-slate-200">
          <div className="flex gap-4 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-ink text-ink'
                    : 'border-transparent text-slate-600 hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {/* Show Add Prospect Form only in Prospects & Applicants tab */}
          {activeTab === 'prospects' && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Prospect</h3>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createTenant.mutate();
                }}
              >
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={form.lastName}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Property (Optional)</label>
                  <select
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={form.propertyId}
                    onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                  >
                    <option value="">Select property</option>
                    {properties?.map((property: any) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-700 mb-1">Unit (Optional)</label>
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2"
                    value={form.unitId}
                    onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value }))}
                    placeholder="Unit ID"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={createTenant.isPending}
                    className="rounded-lg bg-ink text-white px-4 py-2 disabled:opacity-50"
                  >
                    {createTenant.isPending ? 'Adding...' : 'Add Prospect'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tenants List */}
          <div>
            {filteredTenants.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Active Lease</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant: any) => {
                    const activeLease = tenant.leases?.some((lt: any) => lt.lease?.status === 'ACTIVE');
                    const latestScreening = tenant.screeningRequests?.[0];
                    return (
                      <tr key={tenant.id} className="border-t border-slate-100">
                        <td className="py-2 font-medium text-ink">
                          <Link className="underline" href={`/tenants/${tenant.id}`}>
                            {tenant.firstName} {tenant.lastName}
                          </Link>
                        </td>
                        <td className="py-2 text-slate-600">{tenant.email ?? '-'}</td>
                        <td className="py-2">
                          <span className="capitalize">{tenant.status?.toLowerCase() || '-'}</span>
                          {latestScreening && (
                            <div className="text-xs text-slate-500">
                              Screening: {latestScreening.status}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-slate-600">{activeLease ? 'Yes' : 'No'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-slate-600 py-8">
                {activeTab === 'active' 
                  ? 'No active tenants found.' 
                  : 'No prospects or applicants found.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
