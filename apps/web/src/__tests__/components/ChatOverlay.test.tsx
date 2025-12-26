import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatOverlay } from '../../components/ChatOverlay';

// Mock scrollIntoView
(global as any).Element.prototype.scrollIntoView = jest.fn();

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

describe('ChatOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).Element.prototype.scrollIntoView = jest.fn();
  });

  it('should render closed by default', () => {
    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    expect(toggleButton).toBeInTheDocument();
    expect(screen.queryByText("Hi! I'm your copilot.")).not.toBeInTheDocument();
  });

  it('should open when toggle button is clicked', async () => {
    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your copilot/i)).toBeInTheDocument();
    });
  });

  it('should close when close button is clicked', async () => {
    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Hi! I'm your copilot/i)).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Hi! I'm your copilot/i)).not.toBeInTheDocument();
    });
  });

  it('should send message when form is submitted', async () => {
    mockApiFetch.mockResolvedValue({
      intent: 'kpis',
      reply: 'Here are your KPIs...',
      suggestions: [],
    });

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'Show me KPIs' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/chat',
        expect.objectContaining({
          method: 'POST',
          body: { message: 'Show me KPIs' },
        })
      );
    });
  });

  it('should display assistant response', async () => {
    mockApiFetch.mockResolvedValue({
      intent: 'kpis',
      reply: 'Here are your KPIs: 10 properties, 25 units',
      suggestions: [],
    });

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'Show me KPIs' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Show me KPIs')).toBeInTheDocument();
      expect(screen.getByText('Here are your KPIs: 10 properties, 25 units')).toBeInTheDocument();
    });
  });

  it('should display error message on API failure', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'Show me KPIs' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I could not complete that request/)).toBeInTheDocument();
    });
  });

  it('should not send empty message', () => {
    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: '   ' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('should display suggestions when provided', async () => {
    mockApiFetch.mockResolvedValue({
      intent: 'kpis',
      reply: 'Here are your KPIs',
      suggestions: ['Show work orders', 'Show delinquent charges'],
    });

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'Show me KPIs' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Show work orders')).toBeInTheDocument();
      expect(screen.getByText('Show delinquent charges')).toBeInTheDocument();
    });
  });

  it('should send message when suggestion is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        intent: 'kpis',
        reply: 'Here are your KPIs',
        suggestions: ['Show work orders'],
      })
      .mockResolvedValueOnce({
        intent: 'work_orders',
        reply: 'Here are your work orders',
        suggestions: [],
      });

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'Show me KPIs' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Show work orders')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show work orders'));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(mockApiFetch).toHaveBeenLastCalledWith(
        '/chat',
        expect.objectContaining({
          method: 'POST',
          body: { message: 'Show work orders' },
        })
      );
    });
  });

  it('should not send message when isLoading is true', async () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'First message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    // Try to send another message while loading
    fireEvent.change(input, { target: { value: 'Second message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Should only have been called once (the second call should be prevented)
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('should display error message when token is missing', async () => {
    jest.spyOn(require('../../context/AuthContext'), 'useAuth').mockReturnValue({
      token: null,
    });

    render(<ChatOverlay />);

    const toggleButton = screen.getByRole('button', { name: /Open copilot/i });
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/ask about kpis|delinquencies/i);
    fireEvent.change(input, { target: { value: 'Show me KPIs' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Please log in to use the assistant/i)).toBeInTheDocument();
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
  });


});
