import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEFAULT_PEAK_SCHEDULE } from '../constants';
import { WELLINGTON_PLANS } from '../data/wellington-plans';
import { calculatePlanCost } from '../lib/calculator';
import type { UsagePattern } from '../types';
import PlanRow from './PlanRow';

const usage: UsagePattern = {
  hourlyUsage: Array.from({ length: 24 }, (_, hour) =>
    hour >= 17 && hour <= 21 ? 2 : 0.8,
  ),
  totalDaily: 24.8,
};

const result = calculatePlanCost(
  usage,
  WELLINGTON_PLANS.find((plan) => plan.id === 'powershop-powershop') ?? WELLINGTON_PLANS[0],
  'standard',
  DEFAULT_PEAK_SCHEDULE,
);

const meta: Meta<typeof PlanRow> = {
  title: 'Components/PlanRow',
  component: PlanRow,
};

export default meta;
type Story = StoryObj<typeof PlanRow>;

export const BestValue: Story = {
  args: {
    result: result!,
    rank: 1,
    isBest: true,
    isCurrent: false,
    onSelectCurrent: () => {},
  },
};

export const CurrentPlan: Story = {
  args: {
    result: result!,
    rank: 4,
    isBest: false,
    isCurrent: true,
    onSelectCurrent: () => {},
  },
};
