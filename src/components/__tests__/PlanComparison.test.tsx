import { render, screen } from '@testing-library/react';
import PlanComparison from '../PlanComparison';
import type { UsagePattern, ElectricityPlan } from '../../types';

describe('PlanComparison', () => {
  const mockUsage: UsagePattern = {
    hourlyUsage: Array(24).fill(1),
    totalDaily: 24,
  };

  const mockPlans: ElectricityPlan[] = [
    {
      id: 'constant',
      name: 'Constant Rate',
      type: 'constant',
      rate: 0.3,
      dailyCharge: 1.0,
      includeGST: false,
      peakHours: [],
      offPeakRate: 0,
    },
    {
      id: 'tou',
      name: 'Time of Use',
      type: 'time-of-use',
      rate: 0.4,
      offPeakRate: 0.2,
      dailyCharge: 1.2,
      includeGST: false,
      peakHours: [7,8,9,17,18,19],
    },
  ];

  it('renders without crashing and displays headings', () => {
    render(
      <PlanComparison usagePattern={mockUsage} plans={mockPlans} onPlansChange={() => {}} />
    );
    expect(screen.getByText('Plan Settings')).toBeInTheDocument();
    expect(screen.getByText('Cost Comparison')).toBeInTheDocument();
  });

  it('shows plan names and cost breakdown', () => {
    render(
      <PlanComparison usagePattern={mockUsage} plans={mockPlans} onPlansChange={() => {}} />
    );
    expect(screen.getAllByText('Constant Rate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Time of Use').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Daily Charge/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total Daily Cost/).length).toBeGreaterThan(0);
  });
});
