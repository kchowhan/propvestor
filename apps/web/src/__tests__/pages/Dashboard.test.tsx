import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../../components/pages/Dashboard';
import { renderWithProviders } from '../../../jest.setup';

const mockApiFetch = jest.fn();
jest.mock('../../api/client', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}));

const mockAuth = {
  token: 'test-token',
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('should render KPI data', async () => {
    mockApiFetch.mockResolvedValue({
      totalProperties: 10,
      totalUnits: 25,
      occupancyRate: 0.8,
      rentDueThisMonth: 25000,
      rentCollectedThisMonth: 20000,
      openWorkOrders: 5,
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('should render error state', async () => {
    mockApiFetch.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load KPIs/)).toBeInTheDocument();
    });
  });
});

