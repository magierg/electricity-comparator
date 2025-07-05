import type { Meta, StoryObj } from '@storybook/react-vite';
import UserTypeSuggestion from './UserTypeSuggestion';

const meta: Meta<typeof UserTypeSuggestion> = {
  title: 'Components/UserTypeSuggestion',
  component: UserTypeSuggestion,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof UserTypeSuggestion>;

export const LowUser: Story = {
  args: {
    predictedYearlyUsage: 5000,
    suggestedUserType: 'low',
    onSetUserType: () => alert('Set to low user'),
  },
};

export const StandardUser: Story = {
  args: {
    predictedYearlyUsage: 9000,
    suggestedUserType: 'standard',
    onSetUserType: () => alert('Set to standard user'),
  },
};

export const NoSuggestion: Story = {
  args: {
    predictedYearlyUsage: 0,
    suggestedUserType: null,
    onSetUserType: () => {},
  },
};
