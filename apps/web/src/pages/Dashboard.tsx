'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => apiFetch('/reports/kpis', { token }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4 w-8 h-8"></div>
          <div className="text-slate-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>Failed to load KPIs. Please try again later.</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-slate-600">No data available.</div>
        </div>
      </div>
    );
  }

  const occupancyRate = Math.round((data?.occupancyRate ?? 0) * 100);
  const collectionRate = data?.rentDueThisMonth > 0 
    ? Math.round((data?.rentCollectedThisMonth / data?.rentDueThisMonth) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-1">Dashboard Overview</h1>
        <p className="text-sm text-slate-600">Monitor your property portfolio at a glance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card group hover:shadow-medium transition-all duration-300">
          <div className="card-header flex items-center justify-between">
            <span>Portfolio</span>
            <span className="text-2xl">🏢</span>
          </div>
          <div className="card-body">
            <div className="text-3xl font-bold text-ink mb-1">{data?.totalProperties ?? 0}</div>
            <div className="text-sm text-slate-600">Total Properties</div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">Active properties in your portfolio</div>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-medium transition-all duration-300">
          <div className="card-header flex items-center justify-between">
            <span>Units</span>
            <span className="text-2xl">🏠</span>
          </div>
          <div className="card-body">
            <div className="text-3xl font-bold text-ink mb-1">{data?.totalUnits ?? 0}</div>
            <div className="text-sm text-slate-600">Total Units</div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Occupancy Rate</span>
                <span className={`text-sm font-semibold ${occupancyRate >= 90 ? 'text-green-600' : occupancyRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {occupancyRate}%
                </span>
              </div>
              <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${occupancyRate >= 90 ? 'bg-green-600' : occupancyRate >= 70 ? 'bg-yellow-600' : 'bg-red-600'}`}
                  style={{ width: `${occupancyRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-medium transition-all duration-300">
          <div className="card-header flex items-center justify-between">
            <span>Work Orders</span>
            <span className="text-2xl">🔧</span>
          </div>
          <div className="card-body">
            <div className="text-3xl font-bold text-ink mb-1">{data?.openWorkOrders ?? 0}</div>
            <div className="text-sm text-slate-600">Open Orders</div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">Requires attention</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card group hover:shadow-medium transition-all duration-300">
          <div className="card-header flex items-center justify-between">
            <span>Rent Due This Month</span>
            <span className="text-xl">📅</span>
          </div>
          <div className="card-body">
            <div className="text-3xl font-bold text-ink mb-1">
              ${(data?.rentDueThisMonth ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-slate-600 mb-3">Expected rent charges</div>
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Collection Rate</span>
                <span className={`font-semibold ${collectionRate >= 90 ? 'text-green-600' : collectionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {collectionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-medium transition-all duration-300">
          <div className="card-header flex items-center justify-between">
            <span>Collected This Month</span>
            <span className="text-xl">💰</span>
          </div>
          <div className="card-body">
            <div className="text-3xl font-bold text-green-600 mb-1">
              ${(data?.rentCollectedThisMonth ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-slate-600 mb-3">Payments received</div>
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {data?.rentDueThisMonth > 0 
                  ? `$${((data?.rentDueThisMonth - data?.rentCollectedThisMonth) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining`
                  : 'All payments collected'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
