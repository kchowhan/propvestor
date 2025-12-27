'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { apiFetch } from '../api/client';

type Homeowner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  status: string;
  accountBalance: number;
};

type Association = {
  id: string;
  name: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
};

type HomeownerAuthContextValue = {
  token: string | null;
  homeowner: Homeowner | null;
  association: Association | null;
  loading: boolean;
  login: (email: string, password: string, associationId?: string) => Promise<void>;
  register: (payload: {
    associationId: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    unitId?: string;
    propertyId?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
  impersonateAsHomeowner: (homeownerId: string) => Promise<void>;
};

const HomeownerAuthContext = createContext<HomeownerAuthContextValue | undefined>(undefined);

const SESSION_TOKEN = 'cookie';

export const HomeownerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [homeowner, setHomeowner] = useState<Homeowner | null>(null);
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSession = useCallback(async () => {
    // Check localStorage hint to avoid unnecessary requests
    // This is just an optimization - the actual auth is via httpOnly cookies
    const hasSessionHint = typeof window !== 'undefined' && localStorage.getItem('has_ho_session') === 'true';
    if (!hasSessionHint) {
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/homeowner-auth/me');
      setHomeowner(data.homeowner);
      setAssociation(data.association);
      setToken(SESSION_TOKEN);
      // Update hint on success
      if (typeof window !== 'undefined') {
        localStorage.setItem('has_ho_session', 'true');
      }
    } catch (err: any) {
      // Silently handle 401 (not logged in or expired session) - this is expected
      const is401 = err?.errorData?.error?.code === 'UNAUTHORIZED' || 
                    err?.message?.includes('401') ||
                    err?.message?.includes('Missing authorization header') ||
                    err?.message?.includes('Unauthorized') ||
                    err?.message?.includes('Invalid or expired token');
      if (is401) {
        setToken(null);
        // Clear hint on 401 (session expired or not logged in)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('has_ho_session');
        }
      } else {
        console.error('Failed to load homeowner session:', err);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string, associationId?: string) => {
    try {
      console.log('Attempting homeowner login for:', email, associationId ? `(association: ${associationId})` : '');
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password, ...(associationId && { associationId }) },
      });
      console.log('Homeowner login API response:', data);

      if (data.homeowner) {
        setToken(SESSION_TOKEN);
        setHomeowner(data.homeowner);
        setAssociation(data.association);
        // Set localStorage hint
        if (typeof window !== 'undefined') {
          localStorage.setItem('has_ho_session', 'true');
        }
      } else {
        console.error('Homeowner login response missing token:', data);
        throw new Error('Invalid response from server: missing homeowner');
      }
    } catch (error) {
      console.error('Homeowner login failed:', error);
      // Re-throw with more context if it's a generic error
      if (error instanceof Error && error.message === 'Request failed') {
        throw new Error('Invalid email or password.');
      }
      throw error;
    }
  }, []);

  const impersonateAsHomeowner = useCallback(async (homeownerId: string) => {
    try {
      console.log('Superadmin impersonating homeowner:', homeownerId);
      const data = await apiFetch('/homeowner-auth/superadmin-impersonate', {
        method: 'POST',
        body: { homeownerId },
      });

      if (data.homeowner) {
        setToken(SESSION_TOKEN);
        setHomeowner(data.homeowner);
        setAssociation(data.association);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Superadmin impersonation failed:', error);
      throw error;
    }
  }, []);

  const register = useCallback(async (payload: {
    associationId: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    unitId?: string;
    propertyId?: string;
  }) => {
    const data = await apiFetch('/homeowner-auth/register', {
      method: 'POST',
      body: payload,
    });
    // Registration doesn't automatically log in - user needs to verify email first
    return data;
  }, []);

  const logout = useCallback(() => {
    apiFetch('/homeowner-auth/logout', { method: 'POST' }).catch((err) => {
      console.error('Failed to clear homeowner session cookie:', err);
    });
    setToken(null);
    setHomeowner(null);
    setAssociation(null);
    // Clear localStorage hint
    if (typeof window !== 'undefined') {
      localStorage.removeItem('has_ho_session');
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const value = useMemo(
    () => ({ token, homeowner, association, loading, login, register, logout, refreshData, impersonateAsHomeowner }),
    [token, homeowner, association, loading, login, register, logout, refreshData, impersonateAsHomeowner],
  );

  return <HomeownerAuthContext.Provider value={value}>{children}</HomeownerAuthContext.Provider>;
};

export const useHomeownerAuth = () => {
  const ctx = useContext(HomeownerAuthContext);
  if (!ctx) {
    throw new Error('HomeownerAuthContext not available');
  }
  return ctx;
};
