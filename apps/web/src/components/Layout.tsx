'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, organization, organizations, switchOrganization, logout, createOrganization, currentRole } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Check if user is OWNER in at least one organization
  // Note: Backend will enforce additional restrictions (subscription plan, limits, feature flag)
  const canCreateOrganization = organizations.some((org) => org.role === 'OWNER');

  const handleOrgSwitch = async (orgId: string) => {
    if (orgId === organization?.id) {
      setIsOrgMenuOpen(false);
      return;
    }
    try {
      const newToken = await switchOrganization(orgId);
      setIsOrgMenuOpen(false);
      
      // Verify token is in localStorage
      const savedToken = localStorage.getItem('propvestor_token');
      if (savedToken !== newToken) {
        console.error('Token mismatch after switch');
        alert('Failed to switch organization. Please try again.');
        return;
      }
      
      // Invalidate all queries to refetch with new organization context
      await queryClient.invalidateQueries();
      
      // Navigate to dashboard to refresh the view
      router.replace('/dashboard');
    } catch (error) {
      console.error('Failed to switch organization:', error);
      alert('Failed to switch organization. Please try again.');
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setShowCreateOrg(false);
      setIsOrgMenuOpen(false);
      alert('Organization created successfully! You are now the OWNER.');
    } catch (error: any) {
      alert(error.message || 'Failed to create organization. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <div>
              {organizations.length > 1 ? (
                <div className="relative">
                  <button
                    onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                    className="text-2xl font-bold text-ink hover:text-primary-600 flex items-center gap-2 transition-colors group"
                  >
                    {organization?.name ?? 'Organization'}
                    <svg
                      className={`w-5 h-5 transition-transform ${isOrgMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOrgMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOrgMenuOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-large border border-slate-200/60 z-20 animate-slide-down overflow-hidden">
                        <div className="p-3">
                          <div className="text-xs font-semibold text-slate-500 uppercase px-3 py-2 mb-1">
                            Organizations
                          </div>
                          <div className="space-y-1">
                            {organizations.map((org) => (
                              <button
                                key={org.id}
                                onClick={() => handleOrgSwitch(org.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                                  org.id === organization?.id
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-medium">{org.name}</div>
                                <div className={`text-xs mt-0.5 ${org.id === organization?.id ? 'text-primary-100' : 'text-slate-500'}`}>
                                  {org.role}
                                </div>
                              </button>
                            ))}
                          </div>
                          {canCreateOrganization && (
                            <div className="border-t border-slate-200 mt-2 pt-2">
                              {showCreateOrg ? (
                                <form onSubmit={handleCreateOrganization} className="p-2 space-y-2">
                                  <input
                                    type="text"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    placeholder="Organization name"
                                    className="input text-sm"
                                    autoFocus
                                    disabled={isCreating}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="submit"
                                      disabled={isCreating || !newOrgName.trim()}
                                      className="btn btn-primary flex-1 text-sm py-2"
                                    >
                                      {isCreating ? 'Creating...' : 'Create'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowCreateOrg(false);
                                        setNewOrgName('');
                                      }}
                                      className="btn btn-secondary text-sm py-2"
                                      disabled={isCreating}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => setShowCreateOrg(true)}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50 font-medium transition-colors"
                                >
                                  + Create New Organization
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-2xl font-bold text-ink">{organization?.name ?? 'Organization'}</div>
              )}
              <div className="text-sm text-slate-600 mt-1">Welcome back, <span className="font-medium text-ink">{user?.name ?? 'User'}</span></div>
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={logout}
          >
            Log out
          </button>
        </div>
        {children}
      </main>
    </div>
  );
};
