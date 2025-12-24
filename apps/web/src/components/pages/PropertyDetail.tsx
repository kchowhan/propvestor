'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const PropertyDetailPage = () => {
  const params = useParams();
  const id = (params?.id as string) || '';
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [unitForm, setUnitForm] = useState({ name: '', bedrooms: '', bathrooms: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['property', id],
    queryFn: () => apiFetch(`/properties/${id}`, { token }),
    enabled: Boolean(id),
  });

  const createUnit = useMutation({
    mutationFn: () =>
      apiFetch(`/properties/${id}/units`, {
        token,
        method: 'POST',
        body: {
          name: unitForm.name,
          bedrooms: unitForm.bedrooms ? Number(unitForm.bedrooms) : undefined,
          bathrooms: unitForm.bathrooms ? Number(unitForm.bathrooms) : undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      setUnitForm({ name: '', bedrooms: '', bathrooms: '' });
    },
  });

  if (isLoading) {
    return <div>Loading property...</div>;
  }

  if (error || !data) {
    return <div className="text-red-600">Failed to load property.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Property</div>
        <div className="card-body">
          <div className="text-lg font-semibold">{data.name}</div>
          <div className="text-sm text-slate-600">
            {data.addressLine1}
            {data.addressLine2 && <>, {data.addressLine2}</>}
            <br />
            {data.city}, {data.state} {data.postalCode}
          </div>
          <div className="text-sm text-slate-500 mt-1">Type: {data.type}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Units</div>
        <div className="card-body">
          {data.type !== 'SINGLE_FAMILY' ? (
            <form
              className="grid gap-3 md:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                createUnit.mutate();
              }}
            >
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Unit name"
                value={unitForm.name}
                onChange={(e) => setUnitForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Bedrooms"
                value={unitForm.bedrooms}
                onChange={(e) => setUnitForm((prev) => ({ ...prev, bedrooms: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                placeholder="Bathrooms"
                value={unitForm.bathrooms}
                onChange={(e) => setUnitForm((prev) => ({ ...prev, bathrooms: e.target.value }))}
              />
              <button className="rounded-lg bg-ink text-white px-3 py-2" type="submit">
                Add unit
              </button>
            </form>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm">
                <strong>Note:</strong> Single-family properties can only have one unit and do not support adding additional units.
              </p>
            </div>
          )}

          <table className="w-full text-sm mt-4">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Beds</th>
                <th className="pb-2">Baths</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.units?.map((unit: any) => (
                <tr key={unit.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{unit.name}</td>
                  <td className="py-2 text-slate-600">{unit.bedrooms ?? '-'}</td>
                  <td className="py-2 text-slate-600">{unit.bathrooms ?? '-'}</td>
                  <td className="py-2 text-slate-600">{unit.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
