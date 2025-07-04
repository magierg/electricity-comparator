import type { Meta, StoryObj } from '@storybook/react-vite';
import PlanComparison from './PlanComparison';
import type { UsagePattern, ElectricityPlan } from '../types';

const meta: Meta<typeof PlanComparison> = {
  title: 'Components/PlanComparison',
  component: PlanComparison,
};
export default meta;

type Story = StoryObj<typeof PlanComparison>;

const sampleUsage: UsagePattern = {
  hourlyUsage: Array(24).fill(1),
  totalDaily: 24,
};

const samplePlans: ElectricityPlan[] = [
  {
    id: 'constant',
    name: 'Constant Rate',
    type: 'constant',
    rate: 0.30,
    peakHours: [],
    offPeakRate: 0,
    dailyCharge: 0.50,
    includeGST: false,
  },
  {
    id: 'tou',
    name: 'Time-of-Use',
    type: 'time-of-use',
    rate: 0.40,
    peakHours: [7,8,9,17,18,19],
    offPeakRate: 0.20,
    dailyCharge: 0.60,
    includeGST: false,
  },
];

export const Default: Story = {
  args: {
    usagePattern: sampleUsage,
    plans: samplePlans,
    onPlansChange: () => {},
  },
};
