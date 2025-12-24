'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminOrganizations() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'organizations', page, search, statusFilter],
    queryFn: () =>
      apiFetch(`/admin/organizations?page=${page}&search=${search}&status=${statusFilter}`, { token }),
    retry: false,
  });

  const suspend = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/organizations/${id}/suspend`, { token, method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });

  const reactivate = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/organizations/${id}/reactivate`, { token, method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });

  const organizations = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  const getStatusBadge = (subscription: any) => {
    if (!subscription) return <span className="badge bg-slate-100 text-slate-600">No Subscription</span>;
    
    const statusColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      PAST_DUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-yellow-100 text-yellow-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[subscription.status] || 'bg-gray-100 text-gray-800'}`}>
        {subscription.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Organizations</h1>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-600">Loading organizations...</div>
          ) : organizations.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No organizations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Properties</th>
                    <th className="px-4 py-3">Tenants</th>
                    <th className="px-4 py-3">Users</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {organizations.map((org: any) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/organizations/${org.id}`} className="font-medium text-ink hover:text-primary-600">
                          {org.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {org.subscription?.plan?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(org.subscription)}
                      </td>
                      <td className="px-4 py-3">{org._count?.properties || 0}</td>
                      <td className="px-4 py-3">{org._count?.tenants || 0}</td>
                      <td className="px-4 py-3">{org._count?.memberships || 0}</td>
                      <td className="px-4 py-3">
                        {format(new Date(org.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/organizations/${org.id}`}
                            className="text-primary-600 hover:underline text-sm"
                          >
                            View
                          </Link>
                          {org.subscription?.status === 'CANCELLED' || org.subscription?.status === 'EXPIRED' ? (
                            <button
                              onClick={() => reactivate.mutate(org.id)}
                              className="text-green-600 hover:underline text-sm"
                              disabled={reactivate.isPending}
                            >
                              Reactivate
                            </button>
                          ) : org.subscription ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to suspend ${org.name}?`)) {
                                  suspend.mutate(org.id);
                                }
                              }}
                              className="text-red-600 hover:underline text-sm"
                              disabled={suspend.isPending}
                            >
                              Suspend
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} organizations
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

