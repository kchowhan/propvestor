'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const UserManagementPage = () => {
  const { token, currentRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'create' | 'add-existing' | 'users'>('create');
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'VIEWER' });
  const [existingUserForm, setExistingUserForm] = useState({ email: '', role: 'VIEWER' });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch('/users', { token }),
    enabled: currentRole === 'OWNER' || currentRole === 'ADMIN',
  });

  const createUserMutation = useMutation({
    mutationFn: () =>
      apiFetch('/users', {
        token,
        method: 'POST',
        body: newUserForm,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUserForm({ name: '', email: '', role: 'VIEWER' });
      alert('User created successfully! Password has been sent to their email.');
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to create user');
    },
  });

  const addExistingUserMutation = useMutation({
    mutationFn: () =>
      apiFetch('/users/add-existing', {
        token,
        method: 'POST',
        body: existingUserForm,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setExistingUserForm({ email: '', role: 'VIEWER' });
      alert('User added to organization successfully!');
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to add user');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiFetch(`/users/${userId}/role`, {
        token,
        method: 'PUT',
        body: { role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('User role updated successfully!');
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to update user role');
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/users/${userId}`, {
        token,
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('User removed from organization successfully!');
    },
    onError: (error: Error) => {
      alert(error.message || 'Failed to remove user');
    },
  });

  const canManageUsers = currentRole === 'OWNER' || currentRole === 'ADMIN';

  if (!canManageUsers) {
    return (
      <div className="text-red-600">
        You don't have permission to manage users. Only OWNER and ADMIN roles can access this page.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">User Management</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Create User
          </button>
          <button
            onClick={() => setActiveTab('add-existing')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'add-existing'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Add Existing User
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Users
          </button>
        </nav>
      </div>

      {/* Create New User Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Create New User</span>
          </div>
          <div className="card-body">
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate();
            }}
          >
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Name"
              value={newUserForm.name}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              type="email"
              placeholder="Email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={newUserForm.role}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="VIEWER">Viewer</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-ink text-white px-3 py-2"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-2">
            A password will be generated and sent to the user's email.
          </p>
          </div>
        </div>
      )}

      {/* Add Existing User Tab */}
      {activeTab === 'add-existing' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Add Existing User</span>
          </div>
          <div className="card-body">
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              addExistingUserMutation.mutate();
            }}
          >
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              type="email"
              placeholder="User email"
              value={existingUserForm.email}
              onChange={(e) => setExistingUserForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={existingUserForm.role}
              onChange={(e) => setExistingUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="VIEWER">Viewer</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-ink text-white px-3 py-2"
              disabled={addExistingUserMutation.isPending}
            >
              {addExistingUserMutation.isPending ? 'Adding...' : 'Add User'}
            </button>
          </form>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">Organization Members</div>
          <div className="card-body">
          {usersQuery.isLoading ? (
            <div className="text-sm text-slate-600">Loading users...</div>
          ) : usersQuery.error ? (
            <div className="text-sm text-red-600">Failed to load users.</div>
          ) : (
            <div>
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Role</th>
                    <th className="pb-2">Joined</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.map((user: any) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="py-2">{user.name}</td>
                      <td className="py-2 text-slate-600">{user.email}</td>
                      <td className="py-2 text-slate-600">
                        <select
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                          value={user.role}
                          onChange={(e) => {
                            if (confirm(`Change ${user.name}'s role to ${e.target.value}?`)) {
                              updateRoleMutation.mutate({ userId: user.id, role: e.target.value });
                            }
                          }}
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="ACCOUNTANT">Accountant</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                          <option value="OWNER">Owner</option>
                        </select>
                      </td>
                      <td className="py-2 text-slate-600">
                        {new Date(user.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <button
                          className="text-xs text-red-600 hover:underline"
                          onClick={() => {
                            if (confirm(`Remove ${user.name} from this organization?`)) {
                              removeUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

