'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AdminUsers() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [superAdminOnly, setSuperAdminOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', page, search, superAdminOnly],
    queryFn: () =>
      apiFetch(
        `/admin/users?page=${page}&search=${search}&superAdminOnly=${superAdminOnly}`,
        { token }
      ),
    retry: false,
  });

  const toggleAdmin = useMutation({
    mutationFn: ({ userId, isSuperAdmin }: { userId: string; isSuperAdmin: boolean }) =>
      apiFetch(`/admin/users/${userId}/admin`, {
        token,
        method: 'PATCH',
        body: { isSuperAdmin },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to update admin status');
    },
  });

  const users = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

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
        <h1 className="text-3xl font-bold text-ink">Users</h1>
        <Link href="/admin" className="text-primary-600 hover:underline">
          ← Back to Admin Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={superAdminOnly}
                onChange={(e) => setSuperAdminOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Super Admins Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-600">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Super Admin</th>
                    <th className="px-4 py-3">Organizations</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-ink">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.isSuperAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.memberships?.slice(0, 3).map((m: any) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
                              title={`${m.organization?.name} (${m.role})`}
                            >
                              {m.organization?.name}
                            </span>
                          ))}
                          {user.memberships?.length > 3 && (
                            <span className="text-xs text-slate-500">
                              +{user.memberships.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {user.isSuperAdmin ? (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to revoke super admin privileges for ${user.name}?`
                                )
                              ) {
                                toggleAdmin.mutate({ userId: user.id, isSuperAdmin: false });
                              }
                            }}
                            className="text-red-600 hover:underline text-sm"
                            disabled={toggleAdmin.isPending}
                          >
                            Revoke Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to grant super admin privileges to ${user.name}?`
                                )
                              ) {
                                toggleAdmin.mutate({ userId: user.id, isSuperAdmin: true });
                              }
                            }}
                            className="text-primary-600 hover:underline text-sm"
                            disabled={toggleAdmin.isPending}
                          >
                            Make Admin
                          </button>
                        )}
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
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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

