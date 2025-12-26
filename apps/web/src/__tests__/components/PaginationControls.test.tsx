import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '../../components/PaginationControls';

describe('PaginationControls', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <PaginationControls
        pagination={{ total: 10, limit: 20, offset: 0 }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when totalPages is 0', () => {
    const { container } = render(
      <PaginationControls
        pagination={{ total: 0, limit: 20, offset: 0 }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render pagination controls', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 0 }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText(/Showing 1 to 20 of 50 items/)).toBeInTheDocument();
    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should disable Prev button on first page', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 0 }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    const prevButton = screen.getByText('Prev');
    expect(prevButton).toBeDisabled();
  });

  it('should disable Next button on last page', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 40 }}
        page={3}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('should call onPageChange when Prev is clicked', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 20 }}
        page={2}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    const prevButton = screen.getByText('Prev');
    fireEvent.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when Next is clicked', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 0 }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should show correct range for last page', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 40 }}
        page={3}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText(/Showing 41 to 50 of 50 items/)).toBeInTheDocument();
  });

  it('should use custom label', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 0 }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
        label="associations"
      />
    );

    expect(screen.getByText(/Showing 1 to 20 of 50 associations/)).toBeInTheDocument();
  });

  it('should handle missing pagination prop', () => {
    const { container } = render(
      <PaginationControls
        pagination={undefined}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle hasMore property', () => {
    render(
      <PaginationControls
        pagination={{ total: 50, limit: 20, offset: 0, hasMore: true }}
        page={1}
        limit={20}
        onPageChange={mockOnPageChange}
      />
    );

    expect(screen.getByText(/Showing 1 to 20 of 50 items/)).toBeInTheDocument();
  });
});

