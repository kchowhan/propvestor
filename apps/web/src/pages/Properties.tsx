'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const PropertiesPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    type: 'SINGLE_FAMILY',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch('/properties', {
        token,
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setForm({
        name: '',
        addressLine1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'USA',
        type: 'SINGLE_FAMILY',
      });
    },
  });

  if (isLoading) {
    return <div>Loading properties...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load properties.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Add Property</div>
        <div className="card-body">
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Property name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Address line 1"
              value={form.addressLine1}
              onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Postal code"
              value={form.postalCode}
              onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
              required
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="SINGLE_FAMILY">Single family</option>
              <option value="MULTI_FAMILY">Multi family</option>
              <option value="CONDO">Condo</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="OTHER">Other</option>
            </select>
            <button className="rounded-lg bg-ink text-white px-3 py-2" type="submit">
              Add property
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Properties</div>
        <div className="card-body">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Address</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Units</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((property: any) => (
                <tr key={property.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-ink">
                    <Link className="underline" href={`/properties/${property.id}`}>
                      {property.name}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-600">
                    {property.addressLine1}, {property.city}
                  </td>
                  <td className="py-2 text-slate-600">{property.type}</td>
                  <td className="py-2 text-slate-600">{property.units?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
