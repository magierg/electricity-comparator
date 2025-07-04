import type { Meta, StoryObj } from '@storybook/react-vite';
import DataUpload from './DataUpload';

const meta: Meta<typeof DataUpload> = {
  title: 'Components/DataUpload',
  component: DataUpload,
};
export default meta;

type Story = StoryObj<typeof DataUpload>;

export const Default: Story = {
  args: {
    onUsageChange: () => {},
  },
};
