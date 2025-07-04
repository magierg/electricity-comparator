import type { Meta, StoryObj } from '@storybook/react';
import UsageInput from './UsageInput';
import type { UsagePattern } from '../types';

const meta: Meta<typeof UsageInput> = {
  title: 'Components/UsageInput',
  component: UsageInput,
};
export default meta;

type Story = StoryObj<typeof UsageInput>;

const sampleUsage: UsagePattern = {
  hourlyUsage: Array(24).fill(1),
  totalDaily: 24,
};

export const Default: Story = {
  args: {
    usagePattern: sampleUsage,
    onUsageChange: () => {},
  },
};
