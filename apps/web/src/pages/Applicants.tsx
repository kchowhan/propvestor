'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const ApplicantsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyId: '',
    unitId: '',
    notes: '',
  });

  const { data: applicants, isLoading } = useQuery({
    queryKey: ['applicants'],
    queryFn: () => apiFetch('/applicants', { token }),
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });

  const createApplicant = useMutation({
    mutationFn: () =>
      apiFetch('/applicants', {
        token,
        method: 'POST',
        body: form,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        propertyId: '',
        unitId: '',
        notes: '',
      });
      setActiveTab('list');
    },
  });

  const requestScreening = useMutation({
    mutationFn: (applicantId: string) =>
      apiFetch('/screening/request', {
        token,
        method: 'POST',
        body: { applicantId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['screening-requests'] });
    },
  });

  const convertToTenant = useMutation({
    mutationFn: (applicantId: string) =>
      apiFetch(`/applicants/${applicantId}/convert-to-tenant`, {
        token,
        method: 'POST',
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      // Navigate to the new tenant page
      if (response?.data?.id) {
        router.push(`/tenants/${response.data.id}`);
      } else {
        alert('Applicant converted to tenant successfully!');
      }
    },
  });

  const tabs = [
    { id: 'list', label: 'Applicants' },
    { id: 'create', label: 'Add Applicant' },
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
          {/* Create Applicant Tab */}
          {activeTab === 'create' && (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                createApplicant.mutate();
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
              <div className="flex flex-col md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createApplicant.isPending}
                  className="rounded-lg bg-ink text-white px-4 py-2 disabled:opacity-50"
                >
                  {createApplicant.isPending ? 'Creating...' : 'Add Applicant'}
                </button>
              </div>
            </form>
          )}

          {/* Applicants List Tab */}
          {activeTab === 'list' && (
            <div>
              {isLoading ? (
                <div>Loading applicants...</div>
              ) : applicants?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-600">
                    <tr>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Property/Unit</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((applicant: any) => {
                      const latestScreening = applicant.screeningRequests?.[0];
                      return (
                        <tr key={applicant.id} className="border-t border-slate-100">
                          <td className="py-2 font-medium text-ink">
                            {applicant.firstName} {applicant.lastName}
                          </td>
                          <td className="py-2 text-slate-600">{applicant.email}</td>
                          <td className="py-2">
                            <span className="capitalize">{applicant.status}</span>
                            {latestScreening && (
                              <div className="text-xs text-slate-500">
                                Screening: {latestScreening.status}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-slate-600">
                            {applicant.property?.name || '-'} / {applicant.unit?.name || '-'}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              {!latestScreening && (
                                <button
                                  onClick={() => requestScreening.mutate(applicant.id)}
                                  disabled={requestScreening.isPending}
                                  className="text-xs text-ink underline disabled:opacity-50"
                                >
                                  Request Screening
                                </button>
                              )}
                              {latestScreening?.applicationUrl && (
                                <a
                                  href={latestScreening.applicationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-ink underline"
                                >
                                  View Application
                                </a>
                              )}
                              {applicant.status === 'APPROVED' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Convert ${applicant.firstName} ${applicant.lastName} to tenant?`)) {
                                      convertToTenant.mutate(applicant.id);
                                    }
                                  }}
                                  disabled={convertToTenant.isPending}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
                                >
                                  {convertToTenant.isPending ? 'Converting...' : 'Convert to Tenant'}
                                </button>
                              )}
                              {applicant.status !== 'APPROVED' && applicant.status !== 'DECLINED' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Convert ${applicant.firstName} ${applicant.lastName} to tenant? (Status: ${applicant.status})`)) {
                                      convertToTenant.mutate(applicant.id);
                                    }
                                  }}
                                  disabled={convertToTenant.isPending}
                                  className="text-xs text-slate-600 underline disabled:opacity-50"
                                >
                                  {convertToTenant.isPending ? 'Converting...' : 'Convert to Tenant'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-slate-600 py-8">No applicants found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

