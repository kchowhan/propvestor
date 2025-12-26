'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { PaginationControls } from '../PaginationControls';

export const BoardMembersPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [filterAssociationId, setFilterAssociationId] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [page, setPage] = useState(1);
  const listLimit = 20;
  const [form, setForm] = useState({
    associationId: '',
    userId: '',
    homeownerId: '',
    role: 'MEMBER_AT_LARGE',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  const { data: associationsResponse } = useQuery({
    queryKey: ['associations'],
    queryFn: () => apiFetch('/associations?limit=100&offset=0', { token }),
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch('/users?limit=100&offset=0', { token }),
  });

  const { data: homeownersResponse } = useQuery({
    queryKey: ['homeowners', form.associationId],
    queryFn: () => apiFetch(`/homeowners?associationId=${form.associationId}&limit=100&offset=0`, { token }),
    enabled: !!form.associationId,
  });

  const associations = associationsResponse?.data || [];
  const users = usersResponse?.data || [];
  const homeowners = homeownersResponse?.data || [];

  // Build query string for filtering
  const queryParams = new URLSearchParams();
  if (filterAssociationId) queryParams.set('associationId', filterAssociationId);
  if (filterRole) queryParams.set('role', filterRole);

  const { data: boardMembersResponse, isLoading, error } = useQuery({
    queryKey: ['board-members', filterAssociationId, filterRole, page],
    queryFn: () =>
      apiFetch(
        `/board-members?${queryParams.toString()}&limit=${listLimit}&offset=${(page - 1) * listLimit}`,
        { token }
      ),
  });

  const boardMembers = boardMembersResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch('/board-members', {
        token,
        method: 'POST',
        body: {
          ...payload,
          userId: payload.userId || null,
          homeownerId: payload.homeownerId || null,
          endDate: payload.endDate || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members'] });
      setForm({
        associationId: '',
        userId: '',
        homeownerId: '',
        role: 'MEMBER_AT_LARGE',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: '',
      });
      setActiveTab('list');
    },
  });

  if (isLoading) {
    return <div>Loading board members...</div>;
  }

  if (error) {
    return <div className="text-red-600">Failed to load board members.</div>;
  }

  const tabs = [
    { id: 'list', label: 'Board Members' },
    { id: 'create', label: 'Add Board Member' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Board Members</h1>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'list' | 'create')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header">Add Board Member</div>
          <div className="card-body">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Association *</label>
                  <select
                    className="input"
                    value={form.associationId}
                    onChange={(e) => setForm((prev) => ({ ...prev, associationId: e.target.value, homeownerId: '' }))}
                    required
                  >
                    <option value="">Select association</option>
                    {associations.map((assoc: any) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Role *</label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    required
                  >
                    <option value="PRESIDENT">President</option>
                    <option value="VICE_PRESIDENT">Vice President</option>
                    <option value="SECRETARY">Secretary</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="MEMBER_AT_LARGE">Member at Large</option>
                  </select>
                </div>
                <div>
                  <label className="label">User (Property Manager) - Optional</label>
                  <select
                    className="input"
                    value={form.userId}
                    onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value, homeownerId: '' }))}
                  >
                    <option value="">Select user</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Homeowner - Optional</label>
                  <select
                    className="input"
                    value={form.homeownerId}
                    onChange={(e) => setForm((prev) => ({ ...prev, homeownerId: e.target.value, userId: '' }))}
                    disabled={!form.associationId}
                  >
                    <option value="">Select homeowner</option>
                    {homeowners.map((homeowner: any) => (
                      <option key={homeowner.id} value={homeowner.id}>
                        {homeowner.firstName} {homeowner.lastName} ({homeowner.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select either a User or Homeowner (not both)
                  </p>
                </div>
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    className="input"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date (Optional)</label>
                  <input
                    className="input"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Leave empty for active membership
                  </p>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || (!form.userId && !form.homeownerId)}>
                {createMutation.isPending ? 'Adding...' : 'Add Board Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="card">
          <div className="card-header">Board Members</div>
          <div className="card-body">
            <div className="mb-4 flex gap-4">
              <select
                className="input"
                value={filterAssociationId}
                onChange={(e) => setFilterAssociationId(e.target.value)}
              >
                <option value="">All Associations</option>
                {associations.map((assoc: any) => (
                  <option key={assoc.id} value={assoc.id}>
                    {assoc.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="PRESIDENT">President</option>
                <option value="VICE_PRESIDENT">Vice President</option>
                <option value="SECRETARY">Secretary</option>
                <option value="TREASURER">Treasurer</option>
                <option value="MEMBER_AT_LARGE">Member at Large</option>
              </select>
            </div>
            {boardMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No board members found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Association</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Role</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Tenure</th>
                      <th className="text-left py-2 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardMembers.map((member: any) => {
                      const name = member.user
                        ? member.user.name
                        : member.homeowner
                        ? `${member.homeowner.firstName} ${member.homeowner.lastName}`
                        : 'Unknown';
                      const email = member.user
                        ? member.user.email
                        : member.homeowner
                        ? member.homeowner.email
                        : '-';

                      return (
                        <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2">
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-slate-500">{email}</div>
                          </td>
                          <td className="py-2 text-slate-600">{member.association?.name || '-'}</td>
                          <td className="py-2 text-slate-600">{member.role.replace('_', ' ')}</td>
                          <td className="py-2 text-slate-600">
                            {format(new Date(member.startDate), 'MMM d, yyyy')}
                            {member.endDate && ` - ${format(new Date(member.endDate), 'MMM d, yyyy')}`}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                member.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <PaginationControls
          pagination={boardMembersResponse?.pagination}
          page={page}
          limit={listLimit}
          onPageChange={setPage}
          label="board members"
        />
      )}
    </div>
  );
};
