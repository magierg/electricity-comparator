import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { DEFAULT_PEAK_SCHEDULE } from '../../constants';
import { WELLINGTON_PLANS } from '../../data/wellington-plans';
import { calculateAllPlanCosts } from '../../lib/calculator';
import { annualUsageFromPattern, createDefaultUsage } from '../../lib/usage';
import ResultsSummary from '../ResultsSummary';

const usage = createDefaultUsage();
const results = calculateAllPlanCosts(
  usage,
  WELLINGTON_PLANS,
  'standard',
  DEFAULT_PEAK_SCHEDULE,
);
const annualKwh = annualUsageFromPattern(usage);

function renderSummary(overrides: Partial<ComponentProps<typeof ResultsSummary>> = {}) {
  return render(
    <ResultsSummary
      best={results[0]}
      current={results[results.length - 1]}
      annualKwh={annualKwh}
      userType="standard"
      suggestedUserType="standard"
      planCount={results.length}
      onUserTypeChange={jest.fn()}
      onUseSuggested={jest.fn()}
      {...overrides}
    />,
  );
}

describe('ResultsSummary', () => {
  it('shows the best plan and savings against the current plan', () => {
    renderSummary();

    expect(screen.getByText(results[0].planName)).toBeInTheDocument();
    expect(screen.getByText(/per year, ongoing/i)).toBeInTheDocument();
    expect(screen.getByText(/you could save/i)).toBeInTheDocument();
    expect(screen.getByText(/switching from/i)).toBeInTheDocument();
    expect(screen.getByText(/plans available for standard users/i)).toBeInTheDocument();
    expect(screen.getByText(/based on .* per year/i)).toBeInTheDocument();
    expect(screen.getByText(/all prices include 15% gst/i)).toBeInTheDocument();
  });

  it('reports when the current plan is already cheapest', () => {
    renderSummary({ current: results[0] });

    expect(
      screen.getByText(/your current plan is already the cheapest available/i),
    ).toBeInTheDocument();
  });

  it('prompts for usage and a current plan when they are missing', () => {
    renderSummary({ best: undefined, current: undefined });

    expect(screen.getByText(/add some usage to see the best plan/i)).toBeInTheDocument();
    expect(
      screen.getByText(/choose your current plan below to see your estimated savings/i),
    ).toBeInTheDocument();
  });

  it('shows an EV badge for an EV plan', () => {
    const ev = results.find((result) => result.plan.category === 'ev');
    expect(ev).toBeDefined();

    renderSummary({ best: ev!, current: results[results.length - 1] });

    expect(screen.getByText(/ev plan/i)).toBeInTheDocument();
  });

  it('shows the first-year estimate and bundle badge', () => {
    const bundle = results.find((result) => result.plan.id === '2degrees-2degrees-bundle');
    expect(bundle).toBeDefined();

    renderSummary({ best: bundle!, current: results[results.length - 1] });

    expect(screen.getAllByText(/bundle/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/first year after credits\/discounts/i)).toBeInTheDocument();
  });
});
