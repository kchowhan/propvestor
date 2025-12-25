'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const HomeownersPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [filterAssociationId, setFilterAssociationId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [form, setForm] = useState({
    associationId: '',
    unitId: '',
    propertyId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    notes: '',
  });

  const { data: associationsResponse } = useQuery({
    queryKey: ['associations'],
    queryFn: () => apiFetch('/associations', { token }),
  });

  const { data: propertiesResponse } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });

  const associations = associationsResponse?.data || [];
  const properties = propertiesResponse?.data || [];

  // Get units from selected property
  const selectedProperty = properties.find((p: any) => p.id === form.propertyId);
  const units = selectedProperty?.units || [];

  // Build query string for filtering
  const queryParams = new URLSearchParams();
  if (filterAssociationId) queryParams.set('associationId', filterAssociationId);
  if (filterStatus) queryParams.set('status', filterStatus);

  const { data: homeownersResponse, isLoading, error } = useQuery({
    queryKey: ['homeowners', filterAssociationId, filterStatus],
    queryFn: () => apiFetch(`/homeowners?${queryParams.toString()}`, { token }),
  });

  const homeowners = homeownersResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch('/homeowners', {
        token,
        method: 'POST',
        body: {
          ...payload,
          unitId: payload.unitId || null,
          propertyId: payload.propertyId || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeowners'] });
      setForm({
        associationId: '',
        unitId: '',
        propertyId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        status: 'ACTIVE',
        notes: '',
      });
      setActiveTab('list');
    },
  });

  if (isLoading) {
    return <div>Loading homeowners...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load homeowners.</div>;
  }

  const tabs = [
    { id: 'list', label: 'Homeowners' },
    { id: 'create', label: 'Create Homeowner' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Homeowners</h1>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'list' | 'create')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header">Create Homeowner</div>
          <div className="card-body">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Association *</label>
                  <select
                    className="input"
                    value={form.associationId}
                    onChange={(e) => setForm((prev) => ({ ...prev, associationId: e.target.value, unitId: '', propertyId: '' }))}
                    required
                  >
                    <option value="">Select association</option>
                    {associations.map((assoc: any) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Property (Optional)</label>
                  <select
                    className="input"
                    value={form.propertyId}
                    onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value, unitId: '' }))}
                  >
                    <option value="">Select property</option>
                    {properties.map((prop: any) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Unit (Optional)</label>
                  <select
                    className="input"
                    value={form.unitId}
                    onChange={(e) => setForm((prev) => ({ ...prev, unitId: e.target.value }))}
                    disabled={!form.propertyId}
                  >
                    <option value="">Select unit</option>
                    {units.map((unit: any) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DELINQUENT">Delinquent</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="label">First Name *</label>
                  <input
                    className="input"
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input
                    className="input"
                    value={form.lastName}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Homeowner'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="card">
          <div className="card-header">Homeowners</div>
          <div className="card-body">
            <div className="mb-4 flex gap-4">
              <select
                className="input"
                value={filterAssociationId}
                onChange={(e) => setFilterAssociationId(e.target.value)}
              >
                <option value="">All Associations</option>
                {associations.map((assoc: any) => (
                  <option key={assoc.id} value={assoc.id}>
                    {assoc.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DELINQUENT">Delinquent</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            {homeowners.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No homeowners found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Email</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Association</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Unit/Property</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Balance</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homeowners.map((homeowner: any) => (
                      <tr key={homeowner.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2">
                          <Link href={`/homeowners/${homeowner.id}`} className="text-primary-600 hover:underline">
                            {homeowner.firstName} {homeowner.lastName}
                          </Link>
                        </td>
                        <td className="py-2 text-slate-600">{homeowner.email}</td>
                        <td className="py-2 text-slate-600">{homeowner.association?.name || '-'}</td>
                        <td className="py-2 text-slate-600">
                          {homeowner.unit ? (
                            <>
                              {homeowner.unit.property?.name} - {homeowner.unit.name}
                            </>
                          ) : homeowner.property ? (
                            homeowner.property.name
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 text-slate-600">
                          ${parseFloat(homeowner.accountBalance || 0).toFixed(2)}
                        </td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              homeowner.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : homeowner.status === 'DELINQUENT'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {homeowner.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

