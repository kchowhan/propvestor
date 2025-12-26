'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PaginationControls } from '../PaginationControls';

// Helper function to extract error message from unknown error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

export const AssociationsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [page, setPage] = useState(1);
  const listLimit = 20;
  const [form, setForm] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    phone: '',
    email: '',
    website: '',
    fiscalYearStart: 1,
    notes: '',
  });

  const { data: associationsResponse, isLoading, error } = useQuery({
    queryKey: ['associations', page],
    queryFn: async () => {
      return apiFetch(`/associations?limit=${listLimit}&offset=${(page - 1) * listLimit}`, { token });
    },
  });

  const associations = associationsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch('/associations', {
        token,
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations'] });
      setForm({
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'USA',
        phone: '',
        email: '',
        website: '',
        fiscalYearStart: 1,
        notes: '',
      });
      setActiveTab('list');
    },
  });

  if (isLoading) {
    return <div>Loading associations...</div>;
  }

  if (error) {
    console.error('Associations query error:', error);
    return <div className="text-red-600">Failed to load associations. {getErrorMessage(error)}</div>;
  }

  const tabs = [
    { id: 'list', label: 'Associations' },
    { id: 'create', label: 'Create Association' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">HOA Associations</h1>
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
          <div className="card-header">Create Association</div>
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
                  <label className="label">Association Name *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
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
                <div>
                  <label className="label">Website</label>
                  <input
                    className="input"
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Address Line 1</label>
                  <input
                    className="input"
                    value={form.addressLine1}
                    onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Address Line 2</label>
                  <input
                    className="input"
                    value={form.addressLine2}
                    onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">City</label>
                  <input
                    className="input"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <input
                    className="input"
                    value={form.state}
                    onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Postal Code</label>
                  <input
                    className="input"
                    value={form.postalCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input
                    className="input"
                    value={form.country}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Fiscal Year Start (Month 1-12)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="12"
                    value={form.fiscalYearStart}
                    onChange={(e) => setForm((prev) => ({ ...prev, fiscalYearStart: parseInt(e.target.value) || 1 }))}
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
                {createMutation.isPending ? 'Creating...' : 'Create Association'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="card">
          <div className="card-header">Associations</div>
          <div className="card-body">
            {associations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No associations found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Address</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Contact</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Homeowners</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Properties</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Board Members</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {associations.map((association: any) => (
                      <tr key={association.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2">
                          <Link href={`/associations/${association.id}`} className="text-primary-600 hover:underline">
                            {association.name}
                          </Link>
                        </td>
                        <td className="py-2 text-slate-600">
                          {association.addressLine1 && (
                            <>
                              {association.addressLine1}
                              {association.addressLine2 && <>, {association.addressLine2}</>}
                              <br />
                            </>
                          )}
                          {association.city && (
                            <>
                              {association.city}
                              {association.state && <>, {association.state}</>} {association.postalCode}
                            </>
                          )}
                        </td>
                        <td className="py-2 text-slate-600">
                          {association.email && <div>{association.email}</div>}
                          {association.phone && <div>{association.phone}</div>}
                        </td>
                        <td className="py-2 text-slate-600">{association.homeownerCount || 0}</td>
                        <td className="py-2 text-slate-600">{association.propertyCount || 0}</td>
                        <td className="py-2 text-slate-600">{association.boardMemberCount || 0}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              association.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {association.isActive ? 'Active' : 'Inactive'}
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

      {activeTab === 'list' && (
        <PaginationControls
          pagination={associationsResponse?.pagination}
          page={page}
          limit={listLimit}
          onPageChange={setPage}
          label="associations"
        />
      )}
    </div>
  );
};
