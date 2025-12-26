import { render, screen, fireEvent } from '@testing-library/react';
import { Logo } from '../../components/Logo';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: any) => {
    return (
      <img
        src={src}
        alt={alt}
        onError={onError}
        {...props}
        data-testid="logo-image"
      />
    );
  },
}));

describe('Logo Component', () => {
  it('should render', () => {
    const { container } = render(<Logo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render with custom className', () => {
    const { container } = render(<Logo className="custom-class" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should show fallback text when image fails to load', () => {
    render(<Logo />);
    
    const img = screen.getByTestId('logo-image');
    fireEvent.error(img);
    
    expect(screen.getByText('PI')).toBeInTheDocument();
  });

  it('should render image with correct attributes', () => {
    render(<Logo />);
    
    const img = screen.getByTestId('logo-image');
    expect(img).toHaveAttribute('src', '/logo.png');
    expect(img).toHaveAttribute('alt', 'PropVestor');
  });
});
