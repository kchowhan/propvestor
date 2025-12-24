import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create a test QueryClient with default options
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper to render with QueryClientProvider
export const renderWithProviders = (ui) => {
  const queryClient = createTestQueryClient();
  const { render } = require('@testing-library/react');
  const React = require('react');
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, ui)
  );
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    elements: jest.fn(() => ({
      create: jest.fn(),
      getElement: jest.fn(),
    })),
    confirmSetup: jest.fn(),
  })),
}));

