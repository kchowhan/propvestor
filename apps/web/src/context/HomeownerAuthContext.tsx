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

  const login = useCallback(async (email: string, password: string, associationId?: string) => {
    try {
      const data = await apiFetch('/homeowner-auth/login', {
        method: 'POST',
        body: { email, password, ...(associationId && { associationId }) },
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
      console.error('Homeowner login failed:', error);
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
    () => ({ token, homeowner, association, loading, login, register, logout, refreshData }),
    [token, homeowner, association, loading, login, register, logout, refreshData],
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

