import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_PEAK_SCHEDULE } from '../../constants';
import { WELLINGTON_PLANS } from '../../data/wellington-plans';
import { calculateAllPlanCosts } from '../../lib/calculator';
import { createDefaultUsage } from '../../lib/usage';
import PlanResults from '../PlanResults';

const results = calculateAllPlanCosts(
  createDefaultUsage(),
  WELLINGTON_PLANS,
  'standard',
  DEFAULT_PEAK_SCHEDULE,
);

function renderResults(overrides: Partial<ComponentProps<typeof PlanResults>> = {}) {
  return render(
    <PlanResults
      results={results}
      currentPlanOptions={results}
      providers={['Contact Energy', 'Octopus Energy']}
      provider="all"
      category="all"
      currentPlanId=""
      onProviderChange={jest.fn()}
      onCategoryChange={jest.fn()}
      onSelectCurrent={jest.fn()}
      {...overrides}
    />,
  );
}

describe('PlanResults', () => {
  it('renders the empty state when no plans match', () => {
    renderResults({ results: [], currentPlanOptions: [], providers: [] });

    expect(screen.getByText(/0 plans shown/i)).toBeInTheDocument();
    expect(screen.getByText(/no plans match those filters/i)).toBeInTheDocument();
  });

  it('shows filter controls and reports a filtered count', () => {
    const onProviderChange = jest.fn();
    const onCategoryChange = jest.fn();
    renderResults({
      results: [results[0]],
      currentPlanOptions: [results[0]],
      provider: 'Contact Energy',
      onProviderChange,
      onCategoryChange,
    });

    expect(screen.getByText(/1 plan shown after filters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: 'Octopus Energy' },
    });
    expect(onProviderChange).toHaveBeenCalledWith('Octopus Energy');

    fireEvent.change(screen.getByLabelText(/plan type/i), {
      target: { value: 'ev' },
    });
    expect(onCategoryChange).toHaveBeenCalledWith('ev');

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onProviderChange).toHaveBeenCalledWith('all');
    expect(onCategoryChange).toHaveBeenCalledWith('all');
  });

  it('selects a current plan from the options', () => {
    const onSelectCurrent = jest.fn();
    renderResults({ onSelectCurrent });

    const currentPlan = screen.getByLabelText(/your current plan/i) as HTMLSelectElement;
    fireEvent.change(currentPlan, {
      target: { value: currentPlan.options[1].value },
    });

    expect(onSelectCurrent).toHaveBeenCalledWith(currentPlan.options[1].value);
  });

  it('renders a plan row for each result', () => {
    renderResults();

    expect(screen.getAllByText(results[0].planName).length).toBeGreaterThan(0);
    expect(screen.getByText(/plans shown/i)).toBeInTheDocument();
    expect(screen.getAllByText(/best value/i).length).toBeGreaterThan(0);
  });
});
