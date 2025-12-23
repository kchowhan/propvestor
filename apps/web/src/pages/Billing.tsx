'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const BillingPage = () => {
  const { token } = useAuth();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const rentRollQuery = useQuery({
    queryKey: ['rent-roll', month, year],
    queryFn: () => apiFetch(`/reports/rent-roll?month=${month}&year=${year}`, { token }),
  });

  const generateMonthly = useMutation({
    mutationFn: () =>
      apiFetch('/billing/generate-monthly-rent', {
        token,
        method: 'POST',
        body: { month: Number(month), year: Number(year) },
      }),
    onSuccess: () => rentRollQuery.refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Rent Roll</div>
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="Month"
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Year"
            />
            <button
              className="rounded-lg bg-ink text-white px-3 py-2"
              onClick={() => generateMonthly.mutate()}
            >
              Generate monthly rent
            </button>
          </div>

          {rentRollQuery.isLoading ? (
            <div>Loading rent roll...</div>
          ) : rentRollQuery.error ? (
            <div className="text-red-600">Failed to load rent roll.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-600">
                <tr>
                  <th className="pb-2">Property</th>
                  <th className="pb-2">Unit</th>
                  <th className="pb-2">Tenants</th>
                  <th className="pb-2">Rent</th>
                  <th className="pb-2">Paid</th>
                  <th className="pb-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rentRollQuery.data && rentRollQuery.data.length > 0 ? (
                  rentRollQuery.data.map((row: any) => (
                    <tr key={row.chargeId} className="border-t border-slate-100">
                      <td className="py-2">{row.property?.name ?? '-'}</td>
                      <td className="py-2">{row.unit?.name ?? '-'}</td>
                      <td className="py-2">
                        {row.tenants?.map((tenant: any) => tenant.firstName).join(', ') || '-'}
                      </td>
                      <td className="py-2">${(row.rentAmount ?? 0).toFixed(2)}</td>
                      <td className="py-2">${(row.amountPaid ?? 0).toFixed(2)}</td>
                      <td className="py-2">${(row.balance ?? 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-600">
                      No rent charges found for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
