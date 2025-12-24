import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const LeaseDetailPage = () => {
  const params = useParams();
  const id = (params?.id as string) || '';
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data, isLoading, error } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => apiFetch(`/leases/${id}`, { token }),
    enabled: Boolean(id),
  });

  const generateRent = useMutation({
    mutationFn: () =>
      apiFetch(`/leases/${id}/generate-rent-charge`, {
        token,
        method: 'POST',
        body: { month: Number(month), year: Number(year) },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lease', id] }),
  });

  const activateLease = useMutation({
    mutationFn: () =>
      apiFetch(`/leases/${id}/activate`, {
        token,
        method: 'POST',
        body: {},
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lease', id] }),
  });

  const terminateLease = useMutation({
    mutationFn: () =>
      apiFetch(`/leases/${id}/terminate`, {
        token,
        method: 'POST',
        body: {},
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lease', id] }),
  });

  if (isLoading) {
    return <div>Loading lease...</div>;
  }

  if (error || !data) {
    return <div className="text-red-600">Failed to load lease.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Lease</div>
        <div className="card-body space-y-2">
          <div className="text-lg font-semibold">
            {data.unit?.property?.name} - {data.unit?.name}
          </div>
          <div className="text-sm text-slate-600">Status: {data.status}</div>
          <div className="text-sm text-slate-600">Rent: ${Number(data.rentAmount).toFixed(2)}</div>
          <div className="text-sm text-slate-600">
            {new Date(data.startDate).toLocaleDateString()} -{' '}
            {new Date(data.endDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Tenants</div>
        <div className="card-body">
          <div className="text-sm text-slate-600">
            {data.tenants?.map((lt: any) => lt.tenant.firstName + ' ' + lt.tenant.lastName).join(', ')}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Actions</div>
        <div className="card-body flex flex-wrap gap-3">
          {data.status === 'DRAFT' && (
            <button
              className="rounded-lg bg-green-600 text-white px-3 py-2"
              onClick={() => activateLease.mutate()}
            >
              Activate Lease
            </button>
          )}
          <div className="flex items-center gap-2">
            <input
              className="rounded-lg border border-slate-200 px-2 py-1"
              placeholder="Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-200 px-2 py-1"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <button className="rounded-lg bg-ink text-white px-3 py-2" onClick={() => generateRent.mutate()}>
              Generate rent charge
            </button>
          </div>
          {data.status === 'ACTIVE' && (
            <button className="rounded-lg border border-slate-200 px-3 py-2" onClick={() => terminateLease.mutate()}>
              Terminate lease
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Charges</div>
        <div className="card-body">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="pb-2">Description</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.charges?.map((charge: any) => (
                <tr key={charge.id} className="border-t border-slate-100">
                  <td className="py-2">{charge.description}</td>
                  <td className="py-2">${Number(charge.amount).toFixed(2)}</td>
                  <td className="py-2">{charge.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Payments</div>
        <div className="card-body">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="pb-2">Date</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Method</th>
              </tr>
            </thead>
            <tbody>
              {data.payments?.map((payment: any) => (
                <tr key={payment.id} className="border-t border-slate-100">
                  <td className="py-2">{new Date(payment.receivedDate).toLocaleDateString()}</td>
                  <td className="py-2">${Number(payment.amount).toFixed(2)}</td>
                  <td className="py-2">{payment.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
