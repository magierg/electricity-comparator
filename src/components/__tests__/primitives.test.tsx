import { render, screen } from '@testing-library/react';
import Badge from '../Badge';
import Card from '../Card';
import LoadingSpinner from '../LoadingSpinner';

describe('Badge', () => {
  it('renders the default tone and custom classes', () => {
    render(<Badge className="custom-badge">Wellington</Badge>);

    const badge = screen.getByText('Wellington');
    expect(badge).toHaveClass('bg-slate-100', 'custom-badge');
  });

  it('renders each tone', () => {
    const { rerender } = render(<Badge tone="blue">Blue</Badge>);
    expect(screen.getByText('Blue')).toHaveClass('bg-blue-50');

    rerender(<Badge tone="amber">Amber</Badge>);
    expect(screen.getByText('Amber')).toHaveClass('bg-amber-50');

    rerender(<Badge tone="emerald">Emerald</Badge>);
    expect(screen.getByText('Emerald')).toHaveClass('bg-emerald-50');

    rerender(<Badge tone="violet">Violet</Badge>);
    expect(screen.getByText('Violet')).toHaveClass('bg-violet-50');
  });
});

describe('Card', () => {
  it('renders an accessible section with a custom class', () => {
    render(
      <Card ariaLabel="Test card" className="custom-card">
        <p>Card body</p>
      </Card>,
    );

    const card = screen.getByRole('region', { name: 'Test card' });
    expect(card).toHaveClass('custom-card');
    expect(screen.getByText('Card body')).toBeInTheDocument();
  });
});

describe('LoadingSpinner', () => {
  it('renders a status with text and default size', () => {
    render(<LoadingSpinner text="Loading data" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading data');
  });

  it('supports sizes, no text, and custom classes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" text="" className="custom-spinner" />);
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
    expect(screen.getByRole('status')).not.toHaveTextContent('Loading');

    rerender(<LoadingSpinner size="lg" text="Large" />);
    expect(screen.getByRole('status')).toHaveTextContent('Large');
  });
});
