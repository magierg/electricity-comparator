import type { Meta, StoryObj } from '@storybook/react-vite';
import SectionCard from './SectionCard';

const meta: Meta<typeof SectionCard> = {
  title: 'Components/SectionCard',
  component: SectionCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof SectionCard>;

export const Default: Story = {
  args: {
    children: <div className="text-lg">Section content goes here</div>,
    ariaLabel: 'Example section',
  },
};
