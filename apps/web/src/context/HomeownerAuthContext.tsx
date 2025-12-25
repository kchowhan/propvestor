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
  impersonateAsHomeowner: (homeownerId: string, userToken: string) => Promise<void>;
};

const HomeownerAuthContext = createContext<HomeownerAuthContextValue | undefined>(undefined);

const HOMEOWNER_TOKEN_KEY = 'propvestor_homeowner_token';

export const HomeownerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [homeowner, setHomeowner] = useState<Homeowner | null>(null);
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSession = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/homeowner-auth/me', { token });
      setHomeowner(data.homeowner);
      setAssociation(data.association);
    } catch (err) {
      console.error('Failed to load homeowner session:', err);
      setToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(HOMEOWNER_TOKEN_KEY);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initialize token from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(HOMEOWNER_TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
      } else {
        setLoading(false); // No token, so we're done loading
      }
    } else {
      setLoading(false); // Server-side, no token
    }
  }, []);

  useEffect(() => {
    if (token !== null) {
      loadSession();
    } else {
      setLoading(false);
    }
  }, [token, loadSession]);

  const login = useCallback(async (email: string, password: string, associationId?: string) => {
    try {
      console.log('Attempting homeowner login for:', email, associationId ? `(association: ${associationId})` : '');
      const data = await apiFetch('/homeowner-auth/login', {
        method: 'POST',
        body: { email, password, ...(associationId && { associationId }) },
      });
      console.log('Homeowner login API response:', data);

      if (data.token) {
        setToken(data.token);
        if (typeof window !== 'undefined') {
          localStorage.setItem(HOMEOWNER_TOKEN_KEY, data.token);
        }
        setHomeowner(data.homeowner);
        setAssociation(data.association);
      } else {
        console.error('Homeowner login response missing token:', data);
        throw new Error('Invalid response from server: missing token');
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

  const impersonateAsHomeowner = useCallback(async (homeownerId: string, userToken: string) => {
    try {
      console.log('Superadmin impersonating homeowner:', homeownerId);
      const data = await apiFetch('/homeowner-auth/superadmin-impersonate', {
        method: 'POST',
        body: { homeownerId },
        token: userToken, // Use the regular user token (superadmin)
      });

      if (data.token) {
        setToken(data.token);
        if (typeof window !== 'undefined') {
          localStorage.setItem(HOMEOWNER_TOKEN_KEY, data.token);
        }
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
    setToken(null);
    setHomeowner(null);
    setAssociation(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HOMEOWNER_TOKEN_KEY);
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (token) {
      await loadSession();
    }
  }, [token, loadSession]);

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

