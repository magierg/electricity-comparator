import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_PEAK_SCHEDULE } from '../../constants';
import { WELLINGTON_PLANS } from '../../data/wellington-plans';
import { calculatePlanCost } from '../../lib/calculator';
import { createDefaultUsage } from '../../lib/usage';
import PlanRow from '../PlanRow';

function resultFor(pricing: 'inclusive' | 'peak-offpeak' | 'peak-shoulder-offpeak') {
  const plan = WELLINGTON_PLANS.find(
    (candidate) => candidate.pricing === pricing && candidate.variants.standard,
  );
  expect(plan).toBeDefined();
  const result = calculatePlanCost(
    createDefaultUsage(),
    plan!,
    'standard',
    DEFAULT_PEAK_SCHEDULE,
  );
  expect(result).not.toBeNull();
  return result!;
}

describe('PlanRow', () => {
  it('renders a best-value inclusive plan and selects it', () => {
    const result = resultFor('inclusive');
    const onSelectCurrent = jest.fn();

    render(
      <PlanRow
        result={result}
        rank={1}
        isBest
        isCurrent={false}
        onSelectCurrent={onSelectCurrent}
      />,
    );

    expect(screen.getByText(result.planName)).toBeInTheDocument();
    expect(screen.getByText(/best value/i)).toBeInTheDocument();
    expect(screen.getByText(/flat rate/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /this is my plan/i }));
    expect(onSelectCurrent).toHaveBeenCalledWith(result.plan.id);
  });

  it('renders a selected plan and its expanded cost breakdown', () => {
    const result = resultFor('peak-offpeak');

    render(
      <PlanRow
        result={result}
        rank={2}
        isBest={false}
        isCurrent
        onSelectCurrent={jest.fn()}
      />,
    );

    expect(screen.getByText(/your plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /current plan/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`show ${result.planName} details`, 'i') }));

    expect(screen.getByText(/cost breakdown/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /plan details/i })).toBeInTheDocument();
    expect(screen.getAllByText(/peak/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/off-peak/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/shoulder/i)).toHaveLength(0);
    expect(screen.getByText(/effective usage rate/i)).toBeInTheDocument();
  });

  it('renders the shoulder line for a three-tier plan', () => {
    const result = resultFor('peak-shoulder-offpeak');

    render(
      <PlanRow
        result={result}
        rank={3}
        isBest={false}
        isCurrent={false}
        onSelectCurrent={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`show ${result.planName} details`, 'i') }));

    expect(screen.getAllByText(/shoulder/i).length).toBeGreaterThan(0);
  });

  it('renders a material free-power value', () => {
    const plan = WELLINGTON_PLANS.find(
      (candidate) => candidate.id === 'electric-kiwi-electric-kiwi-sunday-saver',
    );
    expect(plan).toBeDefined();
    const result = calculatePlanCost(
      createDefaultUsage(),
      plan!,
      'standard',
      DEFAULT_PEAK_SCHEDULE,
    );
    expect(result).not.toBeNull();

    render(
      <PlanRow
        result={result!}
        rank={5}
        isBest={false}
        isCurrent={false}
        onSelectCurrent={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`show ${result!.planName} details`, 'i') }));

    expect(screen.getAllByText(/free power value/i).length).toBeGreaterThan(0);
  });

  it('renders discounts, contract terms, and first-year pricing', () => {
    const result = resultFor('inclusive');

    render(
      <PlanRow
        result={result}
        rank={4}
        isBest={false}
        isCurrent={false}
        onSelectCurrent={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`show ${result.planName} details`, 'i') }));

    expect(screen.getAllByText(/sign-up credit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/10% discount/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/contract/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/discount:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/first year after discounts/i).length).toBeGreaterThan(0);
  });
});
