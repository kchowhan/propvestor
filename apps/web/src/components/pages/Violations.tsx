'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const ViolationsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [filterAssociationId, setFilterAssociationId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [form, setForm] = useState({
    associationId: '',
    homeownerId: '',
    unitId: '',
    propertyId: '',
    type: '',
    severity: 'MINOR' as 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL',
    description: '',
    violationDate: new Date().toISOString().split('T')[0],
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

  // Get homeowners for selected association
  const { data: homeownersResponse } = useQuery({
    queryKey: ['homeowners', form.associationId],
    queryFn: () => apiFetch(`/homeowners?associationId=${form.associationId}`, { token }),
    enabled: !!form.associationId,
  });

  const homeowners = homeownersResponse?.data || [];

  // Get units from selected property
  const selectedProperty = properties.find((p: any) => p.id === form.propertyId);
  const units = selectedProperty?.units || [];

  // Build query string for filtering
  const queryParams = new URLSearchParams();
  if (filterAssociationId) queryParams.set('associationId', filterAssociationId);
  if (filterStatus) queryParams.set('status', filterStatus);
  if (filterSeverity) queryParams.set('severity', filterSeverity);

  const { data: violationsResponse, isLoading, error } = useQuery({
    queryKey: ['violations', filterAssociationId, filterStatus, filterSeverity],
    queryFn: () => apiFetch(`/violations?${queryParams.toString()}`, { token }),
  });

  const violations = violationsResponse?.data || [];

  // Get selected violation details
  const { data: violationDetails } = useQuery({
    queryKey: ['violation', selectedViolation],
    queryFn: () => apiFetch(`/violations/${selectedViolation}`, { token }),
    enabled: !!selectedViolation,
  });

  const violation = violationDetails?.data;

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch('/violations', {
        token,
        method: 'POST',
        body: {
          ...payload,
          violationDate: payload.violationDate ? new Date(payload.violationDate).toISOString() : undefined,
          unitId: payload.unitId || null,
          propertyId: payload.propertyId || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      setForm({
        associationId: '',
        homeownerId: '',
        unitId: '',
        propertyId: '',
        type: '',
        severity: 'MINOR',
        description: '',
        violationDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setActiveTab('list');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`/violations/${id}`, {
        token,
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['violation', selectedViolation] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/violations/${id}`, {
        token,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      setSelectedViolation(null);
    },
  });

  const severityColors = {
    MINOR: 'bg-yellow-100 text-yellow-800',
    MODERATE: 'bg-orange-100 text-orange-800',
    MAJOR: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-200 text-red-900',
  };

  const statusColors = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    RESOLVED: 'bg-green-100 text-green-800',
    APPEALED: 'bg-yellow-100 text-yellow-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };

  if (isLoading && !violations.length) {
    return <div>Loading violations...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load violations.</div>;
  }

  const tabs = [
    { id: 'list', label: 'Violations' },
    { id: 'create', label: 'Create Violation' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Violations</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'list' | 'create')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Association</label>
                <select
                  value={filterAssociationId}
                  onChange={(e) => setFilterAssociationId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All Associations</option>
                  {associations.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="APPEALED">Appealed</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">All Severities</option>
                  <option value="MINOR">Minor</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="MAJOR">Major</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Violations List */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Homeowner</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No violations found
                      </td>
                    </tr>
                  ) : (
                    violations.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(v.violationDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium text-ink">
                              {v.homeowner.firstName} {v.homeowner.lastName}
                            </div>
                            <div className="text-xs text-slate-500">{v.homeowner.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{v.type}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[v.severity]}`}>
                            {v.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[v.status]}`}>
                            {v.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedViolation(v.id)}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h2 className="text-lg font-semibold text-ink mb-4">Create Violation</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Association *</label>
                <select
                  required
                  value={form.associationId}
                  onChange={(e) => {
                    setForm({ ...form, associationId: e.target.value, homeownerId: '' });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="">Select Association</option>
                  {associations.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Homeowner *</label>
                <select
                  required
                  value={form.homeownerId}
                  onChange={(e) => setForm({ ...form, homeownerId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  disabled={!form.associationId}
                >
                  <option value="">Select Homeowner</option>
                  {homeowners.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.firstName} {h.lastName} ({h.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
                <select
                  value={form.propertyId}
                  onChange={(e) => {
                    setForm({ ...form, propertyId: e.target.value, unitId: '' });
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="">Select Property (Optional)</option>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <select
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  disabled={!form.propertyId}
                >
                  <option value="">Select Unit (Optional)</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Violation Type *</label>
                <input
                  type="text"
                  required
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="e.g., NOISE, PARKING, TRASH, LANDSCAPING"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity *</label>
                <select
                  required
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="MINOR">Minor</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="MAJOR">Major</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Violation Date *</label>
                <input
                  type="date"
                  required
                  value={form.violationDate}
                  onChange={(e) => setForm({ ...form, violationDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Describe the violation in detail..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Internal notes (not visible to homeowner)..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 text-slate-600 hover:text-ink border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Violation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Violation Detail Modal */}
      {selectedViolation && violation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-ink">Violation Details</h2>
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="text-slate-400 hover:text-ink"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Violation Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Type</label>
                  <div className="text-ink font-medium">{violation.type}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Severity</label>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[violation.severity]}`}>
                      {violation.severity}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  <div>
                    <select
                      value={violation.status}
                      onChange={(e) => {
                        updateMutation.mutate({
                          id: violation.id,
                          data: { status: e.target.value },
                        });
                      }}
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[violation.status]}`}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="APPEALED">Appealed</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Violation Date</label>
                  <div className="text-ink">
                    {new Date(violation.violationDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Description</label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg text-ink whitespace-pre-wrap">
                  {violation.description}
                </div>
              </div>

              {/* Homeowner Info */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-ink mb-3">Homeowner</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Name</label>
                    <div className="text-ink">
                      {violation.homeowner.firstName} {violation.homeowner.lastName}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <div className="text-ink">{violation.homeowner.email}</div>
                  </div>
                </div>
              </div>

              {/* Property/Unit Info */}
              {(violation.unit || violation.property) && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-ink mb-3">Property</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {violation.unit && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Unit</label>
                          <div className="text-ink">{violation.unit.name}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Property</label>
                          <div className="text-ink">{violation.unit.property.name}</div>
                        </div>
                      </>
                    )}
                    {violation.property && !violation.unit && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">Property</label>
                        <div className="text-ink">{violation.property.name}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Documents/Photos */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-ink">Attachments</h3>
                  <label className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedViolation) return;

                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('violationId', selectedViolation);

                        try {
                          const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
                          const response = await fetch(`${API_URL}/documents/upload`, {
                            method: 'POST',
                            credentials: 'include',
                            body: formData,
                          });

                          if (!response.ok) {
                            throw new Error('Upload failed');
                          }

                          queryClient.invalidateQueries({ queryKey: ['violation', selectedViolation] });
                        } catch (_err) {
                          alert('Failed to upload file. Please try again.');
                        }
                      }}
                    />
                  </label>
                </div>
                {violation.documents && violation.documents.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {violation.documents.map((doc: any) => (
                      <div key={doc.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-ink truncate">{doc.fileName}</div>
                        <div className="text-xs text-slate-500">{doc.fileType}</div>
                        {doc.storageKey && (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 text-xs mt-1 inline-block"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No attachments</p>
                )}
              </div>

              {/* Letters */}
              {violation.letters && violation.letters.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-ink mb-3">Letters Sent</h3>
                  <div className="space-y-2">
                    {violation.letters.map((letter: any) => (
                      <div key={letter.id} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-ink">{letter.subject}</div>
                            <div className="text-sm text-slate-600">
                              {letter.letterType.replace('_', ' ')} • {letter.sentDate ? new Date(letter.sentDate).toLocaleDateString() : 'Draft'}
                            </div>
                          </div>
                          {letter.pdfUrl && (
                            <a
                              href={letter.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              View PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-slate-200 pt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this violation?')) {
                      deleteMutation.mutate(violation.id);
                    }
                  }}
                  className="px-4 py-2 text-red-600 hover:text-red-700 border border-red-200 rounded-lg"
                >
                  Delete
                </button>
                <Link
                  href={`/violations/${violation.id}/letter`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create Letter
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
