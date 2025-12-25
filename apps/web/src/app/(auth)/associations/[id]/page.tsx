'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function AssociationDetailPage() {
  const params = useParams();
  const associationId = params.id as string;
  const { token } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['association', associationId],
    queryFn: async () => {
      const response = await apiFetch(`/associations/${associationId}`, { token });
      console.log('Association detail API response:', response);
      return response;
    },
  });

  if (isLoading) {
    return <div>Loading association details...</div>;
  }

  if (error) {
    console.error('Association detail error:', error);
    return <div className="text-red-600">Failed to load association details. {error instanceof Error ? error.message : 'Unknown error'}</div>;
  }

  // apiFetch unwraps the data property, so response should be the association object directly
  // But handle both cases: if apiFetch unwrapped it, data is the association; if not, data.data is the association
  const association = (data && typeof data === 'object' && 'data' in data) ? data.data : data;
  console.log('Association data:', association);
  console.log('Raw response data:', data);
  
  if (!association || !association.id) {
    return (
      <div className="text-red-600">
        <p>Association not found.</p>
        <p className="text-xs mt-2 text-slate-400">
          {error ? `Error: ${error instanceof Error ? error.message : 'Unknown error'}` : 'No association data in response.'}
          <br />
          Response: {JSON.stringify(data, null, 2)}
        </p>
      </div>
    );
  }

  const properties = association.properties || [];
  const units = association.units || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/associations" className="text-primary-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Associations
          </Link>
          <h1 className="text-2xl font-bold text-ink">{association.name}</h1>
        </div>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${
            association.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
          }`}
        >
          {association.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Association Details */}
      <div className="card">
        <div className="card-header">Association Information</div>
        <div className="card-body">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <p className="text-slate-900">{association.email || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Phone</label>
              <p className="text-slate-900">{association.phone || '—'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Website</label>
              <p className="text-slate-900">
                {association.website ? (
                  <a href={association.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                    {association.website}
                  </a>
                ) : (
                  '—'
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Fiscal Year Start</label>
              <p className="text-slate-900">
                {association.fiscalYearStart
                  ? new Date(0, association.fiscalYearStart - 1).toLocaleString('default', { month: 'long' })
                  : '—'}
              </p>
            </div>
            {association.addressLine1 && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Address</label>
                <p className="text-slate-900">
                  {association.addressLine1}
                  {association.addressLine2 && <>, {association.addressLine2}</>}
                  <br />
                  {association.city && (
                    <>
                      {association.city}
                      {association.state && <>, {association.state}</>} {association.postalCode}
                    </>
                  )}
                </p>
              </div>
            )}
            {association.notes && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Notes</label>
                <p className="text-slate-900 whitespace-pre-wrap">{association.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary-600">{association.homeownerCount || 0}</div>
            <div className="text-sm text-slate-600 mt-1">Homeowners</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary-600">{association.propertyCount || 0}</div>
            <div className="text-sm text-slate-600 mt-1">Properties</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary-600">{association.unitCount || 0}</div>
            <div className="text-sm text-slate-600 mt-1">Units</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary-600">{association.boardMemberCount || 0}</div>
            <div className="text-sm text-slate-600 mt-1">Board Members</div>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="card">
        <div className="card-header">Properties</div>
        <div className="card-body">
          {properties.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No properties linked to this association.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-semibold text-slate-700">Property Name</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Address</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Type</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Units</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property: any) => (
                    <tr key={property.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2">
                        <Link href={`/properties/${property.id}`} className="text-primary-600 hover:underline">
                          {property.name}
                        </Link>
                      </td>
                      <td className="py-2 text-slate-600">
                        {property.addressLine1}
                        {property.addressLine2 && <>, {property.addressLine2}</>}
                        <br />
                        {property.city}, {property.state} {property.postalCode}
                      </td>
                      <td className="py-2 text-slate-600">{property.type}</td>
                      <td className="py-2 text-slate-600">{property.units?.length || 0}</td>
                      <td className="py-2">
                        <Link href={`/properties/${property.id}`} className="btn btn-sm btn-ghost">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Units */}
      {units.length > 0 && (
        <div className="card">
          <div className="card-header">Units</div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-semibold text-slate-700">Unit Name</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Property</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Bedrooms</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Bathrooms</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Square Feet</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit: any) => (
                    <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 font-medium">{unit.name}</td>
                      <td className="py-2 text-slate-600">
                        <Link href={`/properties/${unit.property.id}`} className="text-primary-600 hover:underline">
                          {unit.property.name}
                        </Link>
                      </td>
                      <td className="py-2 text-slate-600">{unit.bedrooms ?? '—'}</td>
                      <td className="py-2 text-slate-600">{unit.bathrooms ?? '—'}</td>
                      <td className="py-2 text-slate-600">{unit.squareFeet ? `${unit.squareFeet} sq ft` : '—'}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            unit.status === 'OCCUPIED'
                              ? 'bg-green-100 text-green-800'
                              : unit.status === 'VACANT'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <Link href={`/properties/${unit.property.id}`} className="btn btn-sm btn-ghost">
                          View Property
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

