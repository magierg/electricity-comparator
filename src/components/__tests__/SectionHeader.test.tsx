import { render, screen } from '@testing-library/react';
import SectionHeader from '../SectionHeader';

describe('SectionHeader', () => {
  it('renders the title, description, icon, and action', () => {
    render(
      <SectionHeader
        icon={<svg data-testid="icon" />}
        title="Header Title"
        description="A short description"
        action={<button type="button">Action</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Header Title' })).toBeInTheDocument();
    expect(screen.getByText('A short description')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('does not make the icon focusable', () => {
    render(<SectionHeader icon={<svg data-testid="icon" />} title="Header Title" />);

    const icon = screen.getByTestId('icon');
    expect(icon.closest('[tabindex]')).toBeNull();
  });
});
