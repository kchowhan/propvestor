'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHomeownerAuth } from '@/context/HomeownerAuthContext';
import { apiFetch } from '@/api/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { HomeownerPortalHeader } from '@/components/HomeownerPortalHeader';

const WORK_ORDER_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'APPLIANCE', label: 'Appliance' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'PAINTING', label: 'Painting' },
  { value: 'CARPENTRY', label: 'Carpentry' },
  { value: 'ROOFING', label: 'Roofing' },
  { value: 'FLOORING', label: 'Flooring' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

export default function HomeownerMaintenancePage() {
  const { token } = useHomeownerAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [form, setForm] = useState({
    propertyId: '',
    unitId: '',
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'NORMAL',
  });

  // Get dashboard data to get properties/units
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['homeowner-dashboard'],
    queryFn: () => apiFetch('/homeowner-portal/dashboard', { token }),
    enabled: Boolean(token),
  });

  // Get maintenance requests
  const { data: requestsData, isLoading, error } = useQuery({
    queryKey: ['homeowner-maintenance-requests'],
    queryFn: () => apiFetch('/homeowner-portal/maintenance-requests', { token }),
    enabled: Boolean(token),
  });

  // Get properties for the association
  const { data: propertiesData } = useQuery({
    queryKey: ['homeowner-properties'],
    queryFn: () => {
      // Get properties from dashboard or fetch separately
      // For now, we'll use the property/unit from dashboard
      return Promise.resolve({ data: [] });
    },
    enabled: Boolean(token),
  });

  const requests = requestsData?.data || [];
  // Get property from either direct property or from unit.property
  // apiFetch unwraps the response, so dashboardData is already the data object
  const unit = dashboardData?.unit;
  const property = dashboardData?.property || unit?.property;
  
  // Debug: Log the data structure
  if (dashboardData && !property) {
    console.log('Dashboard data:', dashboardData);
    console.log('Property from data:', dashboardData?.data?.property);
    console.log('Unit from data:', dashboardData?.data?.unit);
    console.log('Unit property from data:', dashboardData?.data?.unit?.property);
  }

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch('/homeowner-portal/maintenance-requests', {
        token,
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeowner-maintenance-requests'] });
      setForm({
        propertyId: property?.id || '',
        unitId: unit?.id || '',
        title: '',
        description: '',
        category: 'GENERAL',
        priority: 'NORMAL',
      });
      setActiveTab('list');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

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
        <div className="text-red-600">Failed to load maintenance requests.</div>
      </div>
    );
  }

  const tabs = [
    { id: 'list', label: 'My Requests' },
    { id: 'create', label: 'Submit Request' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeownerPortalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-ink mb-2">Maintenance Requests</h2>
          <Link href="/homeowner/dashboard" className="text-primary-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
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

        {/* Create Form */}
        {activeTab === 'create' && (
          <div className="card">
            <div className="card-header">Submit Maintenance Request</div>
            <div className="card-body">
              {isLoadingDashboard ? (
                <div className="text-center py-8">
                  <div className="spinner"></div>
                  <p className="text-slate-600 mt-4">Loading property information...</p>
                </div>
              ) : !property && !unit?.property ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                  <p className="font-semibold mb-2">Property information not available</p>
                  <p className="text-sm">
                    Please contact your association to ensure your homeowner account is properly linked to a property or unit.
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-yellow-700 cursor-pointer">Debug Information</summary>
                    <pre className="text-xs mt-2 p-2 bg-yellow-100 rounded overflow-auto">
                      {JSON.stringify({ dashboardData, property, unit, 'unit.property': unit?.property }, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // Get property ID from either direct property or unit's property
                  const propertyId = property?.id || unit?.property?.id;
                  if (!propertyId) {
                    alert('Property information not available. Please contact your association.');
                    return;
                  }
                  createMutation.mutate({
                    ...form,
                    propertyId,
                    unitId: unit?.id || null,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Property</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={property?.name || unit?.property?.name || 'Not available'}
                    disabled
                  />
                  {unit && (
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 mt-2"
                      value={`Unit: ${unit.name}`}
                      disabled
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed information about the maintenance issue..."
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      {WORK_ORDER_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority *</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.priority}
                      onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                      required
                    >
                      {PRIORITIES.map((pri) => (
                        <option key={pri.value} value={pri.value}>
                          {pri.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {createMutation.isError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : 'Failed to submit request. Please try again.'}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="btn btn-secondary"
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        )}

        {/* Requests List */}
        {activeTab === 'list' && (
          <div className="card">
            <div className="card-header">My Maintenance Requests</div>
            <div className="card-body">
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 mb-4">No maintenance requests found.</p>
                  <button onClick={() => setActiveTab('create')} className="btn btn-primary">
                    Submit Your First Request
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request: any) => (
                    <div key={request.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-ink mb-1">{request.title}</h3>
                          <p className="text-slate-600 text-sm mb-2">{request.description}</p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="text-slate-500">
                              Property: {request.property?.name || 'N/A'}
                            </span>
                            {request.unit && (
                              <span className="text-slate-500">• Unit: {request.unit.name}</span>
                            )}
                            <span className="text-slate-500">
                              • Submitted: {format(new Date(request.openedAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(request.priority)}`}>
                            {request.priority}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        <span>Category: {request.category}</span>
                        {request.assignedVendor && (
                          <span className="ml-4">• Assigned to: {request.assignedVendor.name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

