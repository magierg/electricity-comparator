import { render, screen } from '@testing-library/react';
import SectionCard from '../SectionCard';

describe('SectionCard', () => {
  it('renders children and aria-label', () => {
    render(
      <SectionCard ariaLabel="Test section">
        <div>Test content</div>
      </SectionCard>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByLabelText('Test section')).toBeInTheDocument();
  });
});
