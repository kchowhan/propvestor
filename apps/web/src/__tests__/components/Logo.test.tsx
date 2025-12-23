import React from 'react';
import { render, screen } from '@testing-library/react';
import { Logo } from '../../components/Logo';

describe('Logo', () => {
  it('should render logo image', () => {
    render(<Logo />);
    const logo = screen.getByAltText('PropVestor Logo');
    expect(logo).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Logo className="custom-class" />);
    const logo = screen.getByAltText('PropVestor Logo');
    expect(logo).toHaveClass('custom-class');
  });

  it('should have eager loading', () => {
    render(<Logo />);
    const logo = screen.getByAltText('PropVestor Logo');
    expect(logo).toHaveAttribute('loading', 'eager');
  });
});

