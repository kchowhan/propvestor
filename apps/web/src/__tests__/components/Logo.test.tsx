import { render } from '@testing-library/react';
import { Logo } from '../../components/Logo';

describe('Logo Component', () => {
  it('should render', () => {
    const { container } = render(<Logo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render with custom className', () => {
    const { container } = render(<Logo className="custom-class" />);
    expect(container.firstChild).toBeTruthy();
  });
});
