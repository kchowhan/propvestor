import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeownerPortalHeader } from '../../components/HomeownerPortalHeader';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockLogout = jest.fn();
const mockHomeownerAuth = {
  homeowner: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  association: {
    id: '1',
    name: 'Test Association',
  },
  logout: mockLogout,
};

jest.mock('../../context/HomeownerAuthContext', () => ({
  useHomeownerAuth: () => mockHomeownerAuth,
}));

describe('HomeownerPortalHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render header with association name', () => {
    render(<HomeownerPortalHeader />);

    expect(screen.getByText('Homeowner Portal')).toBeInTheDocument();
    expect(screen.getByText('Test Association')).toBeInTheDocument();
  });

  it('should render homeowner name', () => {
    render(<HomeownerPortalHeader />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render dashboard link', () => {
    render(<HomeownerPortalHeader />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/homeowner/dashboard');
  });

  it('should render logout button', () => {
    render(<HomeownerPortalHeader />);

    const logoutButton = screen.getByText('Logout');
    expect(logoutButton).toBeInTheDocument();
  });

  it('should call logout and navigate on logout button click', () => {
    render(<HomeownerPortalHeader />);

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith('/homeowner/login');
  });

});

