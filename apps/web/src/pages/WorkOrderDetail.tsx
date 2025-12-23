import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WORK_ORDER_CATEGORIES, getCategoryLabel } from '../constants/workOrderCategories';

export const WorkOrderDetailPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => apiFetch(`/work-orders/${id}`, { token }),
    enabled: Boolean(id),
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiFetch('/vendors', { token }),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/work-orders/${id}`, {
        token,
        method: 'PUT',
        body: { status },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-order', id] }),
  });

  const updateCategory = useMutation({
    mutationFn: (category: string) =>
      apiFetch(`/work-orders/${id}`, {
        token,
        method: 'PUT',
        body: { category },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-order', id] }),
  });

  const updateVendor = useMutation({
    mutationFn: (assignedVendorId: string) =>
      apiFetch(`/work-orders/${id}`, {
        token,
        method: 'PUT',
        body: { assignedVendorId: assignedVendorId || null },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-order', id] }),
  });

  if (isLoading) {
    return <div>Loading work order...</div>;
  }

  if (error || !data) {
    return <div className="text-red-600">Failed to load work order.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Work Order</div>
        <div className="card-body space-y-2">
          <div className="text-lg font-semibold">{data.title}</div>
          <div className="text-sm text-slate-600">Property: {data.property?.name}</div>
          <div className="text-sm text-slate-600">Category: {getCategoryLabel(data.category)}</div>
          <div className="text-sm text-slate-600">Status: {data.status}</div>
          <div className="text-sm text-slate-600">Priority: {data.priority}</div>
          <div className="text-sm text-slate-600">Assigned Vendor: {data.assignedVendor?.name ?? 'Not assigned'}</div>
          <p className="text-sm text-slate-600">{data.description}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Update Category</div>
        <div className="card-body">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 w-full"
            value={data.category}
            onChange={(e) => updateCategory.mutate(e.target.value)}
          >
            {WORK_ORDER_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Assign Vendor</div>
        <div className="card-body">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 w-full"
            value={data.assignedVendorId || ''}
            onChange={(e) => updateVendor.mutate(e.target.value)}
          >
            <option value="">No vendor assigned</option>
            {vendorsQuery.data
              ?.filter((vendor: any) => vendor.category === data.category)
              .map((vendor: any) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
          </select>
          {data.category && vendorsQuery.data?.filter((v: any) => v.category === data.category).length === 0 && (
            <p className="text-xs text-slate-500 mt-2">No vendors available for this category</p>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-header">Update Status</div>
        <div className="card-body flex gap-3">
          {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              className="rounded-lg border border-slate-200 px-3 py-2"
              onClick={() => updateStatus.mutate(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
