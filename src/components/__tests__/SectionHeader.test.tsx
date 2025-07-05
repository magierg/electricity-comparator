import { render, screen } from '@testing-library/react';
import SectionHeader from '../SectionHeader';

describe('SectionHeader', () => {
  it('renders icon and title', () => {
    render(
      <SectionHeader
        icon={<svg data-testid="icon" />}
        title="Header Title"
        colorClass="bg-pink-100"
      />
    );
    expect(screen.getByText('Header Title')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('sets aria-label and tabIndex on icon', () => {
    render(
      <SectionHeader
        icon={<svg data-testid="icon" />}
        title="Header Title"
        colorClass="bg-pink-100"
      />
    );
    const iconDiv = screen.getByLabelText('Header Title icon');
    expect(iconDiv).toHaveAttribute('tabIndex', '0');
  });
});
