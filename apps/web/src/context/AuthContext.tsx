import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../api/client';

export type User = { id: string; name: string; email: string; isSuperAdmin?: boolean };
export type Organization = { id: string; name: string; slug: string };
export type OrganizationMembership = { id: string; name: string; slug: string; role: string };

type AuthMeResponse = {
  user: User;
  organization: Organization;
  currentRole: string | null;
  organizations: OrganizationMembership[];
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  organization: Organization | null;
  organizations: OrganizationMembership[];
  currentRole: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
  }) => Promise<{ token?: string; user?: any; organization?: any; message?: string }>;
  switchOrganization: (organizationId: string) => Promise<string>;
  createOrganization: (name: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'propvestor_token';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // In Next.js, we need to check if we're in the browser before accessing localStorage
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationMembership[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSession = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/me', { token }) as AuthMeResponse;
      setUser(data.user);
      setOrganization(data.organization);
      setOrganizations(data.organizations || []);
      setCurrentRole(data.currentRole || null);
    } catch (err) {
      console.error('Failed to load session:', err);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initialize token from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token !== null) {
      loadSession();
    } else {
      setLoading(false);
    }
  }, [token, loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      console.log('Login successful:', data);
      if (data.token) {
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        setOrganization(data.organization);
        setOrganizations(data.organizations || []);
        // Get current role from /auth/me after login
        const meData = await apiFetch('/auth/me', { token: data.token }) as AuthMeResponse;
        setCurrentRole(meData.currentRole || null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (payload: { name: string; email: string; password: string; organizationName: string }) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: payload,
    });
    setToken(data.token);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setOrganizations([{ id: data.organization.id, name: data.organization.name, slug: data.organization.slug, role: 'OWNER' }]);
    setCurrentRole('OWNER');
    return data; // Return response for caller to check message
  }, []);

  const switchOrganization = useCallback(async (organizationId: string) => {
    try {
      if (!token) {
        throw new Error('No token available');
      }
      const data = await apiFetch('/auth/switch-organization', {
        method: 'POST',
        token,
        body: { organizationId },
      });
      if (data.token) {
        // Save token to localStorage first
        localStorage.setItem(TOKEN_KEY, data.token);
        // Update state
        setToken(data.token);
        setOrganization(data.organization);
        // Reload organizations list with new token
        const meData = await apiFetch('/auth/me', { token: data.token }) as AuthMeResponse;
        setOrganizations(meData.organizations || []);
        setCurrentRole(meData.currentRole || null);
        // Return the new token for verification
        return data.token;
      } else {
        throw new Error('No token received from server');
      }
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    }
  }, [token]);

  const createOrganization = useCallback(async (name: string) => {
    try {
      if (!token) {
        throw new Error('No token available');
      }
      const data = await apiFetch('/organizations', {
        method: 'POST',
        token,
        body: { name },
      });
      
      // Reload organizations list
      const meData = await apiFetch('/auth/me', { token }) as AuthMeResponse;
      setOrganizations(meData.organizations || []);
      
      // Switch to the newly created organization
      if (data.data?.id) {
        await switchOrganization(data.data.id);
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  }, [token, switchOrganization]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOrganization(null);
    setOrganizations([]);
    setCurrentRole(null);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  const value = useMemo(
    () => ({ token, user, organization, organizations, currentRole, loading, login, register, switchOrganization, logout, createOrganization }),
    [token, user, organization, organizations, currentRole, loading, login, register, switchOrganization, logout, createOrganization],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthContext not available');
  }
  return ctx;
};
