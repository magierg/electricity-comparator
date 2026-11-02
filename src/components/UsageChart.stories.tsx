import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEFAULT_PEAK_SCHEDULE } from '../constants';
import type { UsagePattern } from '../types';
import UsageChart from './UsageChart';

const usage: UsagePattern = {
  hourlyUsage: [
    0.5, 0.4, 0.3, 0.3, 0.4, 0.8, 1.2, 1.0, 0.8, 0.6, 0.5, 0.5,
    0.6, 0.7, 0.8, 0.9, 1.5, 2.0, 2.5, 2.2, 1.8, 1.4, 1.0, 0.7,
  ],
  totalDaily: 24.1,
};

const meta: Meta<typeof UsageChart> = {
  title: 'Components/UsageChart',
  component: UsageChart,
};

export default meta;
type Story = StoryObj<typeof UsageChart>;

export const Default: Story = {
  args: {
    usage,
    schedule: DEFAULT_PEAK_SCHEDULE,
  },
};
