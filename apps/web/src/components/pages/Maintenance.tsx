'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { WORK_ORDER_CATEGORIES, getCategoryLabel } from '../../constants/workOrderCategories';

export const MaintenancePage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'vendors' | 'create' | 'orders'>('vendors');
  const [form, setForm] = useState({ propertyId: '', title: '', description: '', category: 'GENERAL', priority: 'NORMAL', assignedVendorId: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', phone: '', website: '', category: 'GENERAL', notes: '' });
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);

  const workOrdersQuery = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => apiFetch('/work-orders', { token }),
  });

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: () => apiFetch('/properties', { token }),
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiFetch('/vendors', { token }),
  });

  const createWorkOrder = useMutation({
    mutationFn: () =>
      apiFetch('/work-orders', {
        token,
        method: 'POST',
        body: {
          ...form,
          assignedVendorId: form.assignedVendorId || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      setForm({ propertyId: '', title: '', description: '', category: 'GENERAL', priority: 'NORMAL', assignedVendorId: '' });
    },
  });

  const createVendor = useMutation({
    mutationFn: () =>
      apiFetch('/vendors', {
        token,
        method: 'POST',
        body: vendorForm,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setVendorForm({ name: '', email: '', phone: '', website: '', category: 'GENERAL', notes: '' });
      setShowVendorForm(false);
    },
  });

  const updateVendor = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/vendors/${id}`, {
        token,
        method: 'PUT',
        body: vendorForm,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setVendorForm({ name: '', email: '', phone: '', website: '', category: 'GENERAL', notes: '' });
      setEditingVendor(null);
      setShowVendorForm(false);
    },
  });

  const deleteVendor = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/vendors/${id}`, {
        token,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleEditVendor = (vendor: any) => {
    setEditingVendor(vendor.id);
    setVendorForm({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone,
      website: vendor.website || '',
      category: vendor.category,
      notes: vendor.notes || '',
    });
    setShowVendorForm(true);
  };

  const handleCancelEdit = () => {
    setEditingVendor(null);
    setVendorForm({ name: '', email: '', phone: '', website: '', category: 'GENERAL', notes: '' });
    setShowVendorForm(false);
  };

  if (workOrdersQuery.isLoading) {
    return <div>Loading work orders...</div>;
  }

  if (workOrdersQuery.error) {
    return <div className="text-red-600">Failed to load work orders.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vendors'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Vendors
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Create Work Order
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Work Orders
          </button>
        </nav>
      </div>

      {/* Vendors Tab */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          {/* Add/Edit Vendor Form */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <span>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</span>
              {!showVendorForm && (
                <button
                  onClick={() => setShowVendorForm(true)}
                  className="text-sm bg-ink text-white px-4 py-2 rounded-lg hover:bg-ink/90"
                >
                  + Add Vendor
                </button>
              )}
            </div>
            {showVendorForm && (
              <div className="card-body">
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingVendor) {
                      updateVendor.mutate(editingVendor);
                    } else {
                      createVendor.mutate();
                    }
                  }}
                >
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Vendor name"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
                      value={vendorForm.category}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      {WORK_ORDER_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {getCategoryLabel(cat)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="vendor@example.com"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
                      type="tel"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, phone: e.target.value }))}
                      required
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
                      type="url"
                      placeholder="https://example.com"
                      value={vendorForm.website}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink"
                      rows={3}
                      value={vendorForm.notes}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this vendor"
                    />
                  </div>
                  <div className="flex gap-3 md:col-span-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-ink text-white px-4 py-2 hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-ink"
                      disabled={createVendor.isPending || updateVendor.isPending}
                    >
                      {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Vendors List */}
          <div className="card">
            <div className="card-header">All Vendors</div>
            <div className="card-body">
              {vendorsQuery.isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading vendors...</div>
              ) : vendorsQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No vendors yet. Add your first vendor above.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Category</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Contact</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Website</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorsQuery.data?.map((vendor: any) => (
                        <tr key={vendor.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{vendor.name}</td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {getCategoryLabel(vendor.category)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div className="space-y-1">
                              {vendor.email && (
                                <div className="text-xs">
                                  <a href={`mailto:${vendor.email}`} className="text-ink hover:underline">
                                    {vendor.email}
                                  </a>
                                </div>
                              )}
                              <div className="text-xs">
                                <a href={`tel:${vendor.phone}`} className="text-slate-600 hover:text-ink">
                                  {vendor.phone}
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {vendor.website ? (
                              <a
                                href={vendor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ink underline hover:text-ink/80 text-xs"
                              >
                                Visit Website
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditVendor(vendor)}
                                className="text-ink hover:text-ink/80 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${vendor.name}?`)) {
                                    deleteVendor.mutate(vendor.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Delete
                              </button>
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
        </div>
      )}

      {/* Create Work Order Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header">Create Work Order</div>
          <div className="card-body">
          <form
            className="grid gap-3 md:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              createWorkOrder.mutate();
            }}
          >
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Property</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={form.propertyId}
                onChange={(e) => setForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                required
              >
                <option value="">Select property</option>
                {propertiesQuery.data?.map((property: any) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                required
              >
                {WORK_ORDER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700 mb-1">Assign Vendor</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={form.assignedVendorId}
                onChange={(e) => setForm((prev) => ({ ...prev, assignedVendorId: e.target.value }))}
              >
                <option value="">No vendor assigned</option>
                {vendorsQuery.data
                  ?.filter((vendor: any) => vendor.category === form.category)
                  .map((vendor: any) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
              </select>
              {form.category && vendorsQuery.data?.filter((v: any) => v.category === form.category).length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No vendors available for this category</p>
              )}
            </div>
            <div className="flex items-end">
              <button className="rounded-lg bg-ink text-white px-3 py-2 w-full" type="submit">
                Add work order
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Work Orders Tab */}
      {activeTab === 'orders' && (
        <div className="card">
          <div className="card-header">Work Orders</div>
          <div className="card-body">
          <table className="w-full text-sm">
            <tbody>
              {workOrdersQuery.data?.map((order: any) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">
                    <Link className="underline" href={`/maintenance/${order.id}`}>
                      {order.title}
                    </Link>
                  </td>
                  <td className="py-2 text-slate-600">{order.property?.name ?? '-'}</td>
                  <td className="py-2 text-slate-600">{getCategoryLabel(order.category)}</td>
                  <td className="py-2 text-slate-600">{order.priority}</td>
                  <td className="py-2 text-slate-600">{order.status}</td>
                  <td className="py-2 text-slate-600">{order.assignedVendor?.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};
