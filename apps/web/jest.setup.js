import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import React from 'react';

// Set up global localStorage mock
import './src/__tests__/setup/localStorage-mock';

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
// React 19 compatible version - use JSX which handles children properly
export const renderWithProviders = (ui) => {
  const queryClient = createTestQueryClient();
  
  // React 19: Use JSX syntax which properly handles React elements as children
  // The wrapper function receives children as a prop, which React 19 handles correctly
  function TestWrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  
  // React Testing Library's render function properly converts ui to children for the wrapper
  return render(ui, { wrapper: TestWrapper });
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

// Mock window.alert and window.confirm
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

