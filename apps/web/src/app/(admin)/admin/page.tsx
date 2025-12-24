'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AdminDashboard() {
  const { token } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiFetch('/admin/stats', { token }),
    retry: false,
    enabled: !!token, // Only fetch when token is available
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">You don't have permission to access the admin dashboard.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-red-700 underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Admin Dashboard</h1>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="text-sm text-slate-600 mb-1">Total Organizations</div>
          <div className="text-3xl font-bold text-ink">{stats?.totalOrganizations || 0}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-slate-600 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-ink">{stats?.totalUsers || 0}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-slate-600 mb-1">Total Properties</div>
          <div className="text-3xl font-bold text-ink">{stats?.totalProperties || 0}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-slate-600 mb-1">Total Tenants</div>
          <div className="text-3xl font-bold text-ink">{stats?.totalTenants || 0}</div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 bg-gradient-to-br from-primary-50 to-white">
          <div className="text-sm text-primary-700 mb-1">Monthly Recurring Revenue</div>
          <div className="text-4xl font-bold text-primary-800">
            ${stats?.revenue?.mrr?.toLocaleString() || '0'}
          </div>
          <div className="text-sm text-primary-600 mt-2">
            ARR: ${stats?.revenue?.arr?.toLocaleString() || '0'}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-sm text-slate-600 mb-3">Subscription Status</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats?.subscriptions?.active || 0}</div>
              <div className="text-sm text-slate-600">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats?.subscriptions?.trial || 0}</div>
              <div className="text-sm text-slate-600">Trial</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats?.subscriptions?.cancelled || 0}</div>
              <div className="text-sm text-slate-600">Cancelled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-600">{stats?.subscriptions?.total || 0}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card">
        <div className="card-header">Quick Actions</div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/organizations"
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-ink">Organizations</div>
              <div className="text-sm text-slate-600">Manage all organizations</div>
            </Link>
            <Link
              href="/admin/users"
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-ink">Users</div>
              <div className="text-sm text-slate-600">Manage users and admins</div>
            </Link>
            <Link
              href="/admin/plans"
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-ink">Subscription Plans</div>
              <div className="text-sm text-slate-600">Manage pricing plans</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

