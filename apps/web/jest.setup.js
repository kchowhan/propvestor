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

// Mock Next.js router - must be a function that returns the mock
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href }) {
    return React.createElement('a', { href }, children);
  };
});

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

