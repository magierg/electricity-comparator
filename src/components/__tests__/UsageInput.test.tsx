import { render, screen, fireEvent } from '@testing-library/react';
import UsageInput from '../UsageInput';
import type { UsagePattern } from '../../types';

describe('UsageInput', () => {
  const mockUsage: UsagePattern = {
    hourlyUsage: Array(24).fill(1),
    totalDaily: 24,
  };

  it('renders mode switcher and summary', () => {
    render(
      <UsageInput usagePattern={mockUsage} onUsageChange={() => {}} />
    );
    expect(screen.getByText('Use Pattern')).toBeInTheDocument();
    expect(screen.getByText('Custom Hours')).toBeInTheDocument();
    expect(screen.getByText('Upload Data')).toBeInTheDocument();
    expect(screen.getByText('Usage Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Daily Usage')).toBeInTheDocument();
  });

  it('switches to individual mode and shows hourly inputs', () => {
    render(
      <UsageInput usagePattern={mockUsage} onUsageChange={() => {}} />
    );
    fireEvent.click(screen.getByText('Custom Hours'));
    expect(screen.getByText('Custom Hourly Usage')).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton').length).toBe(24);
  });

  it('switches to upload mode and shows DataUpload', () => {
    render(
      <UsageInput usagePattern={mockUsage} onUsageChange={() => {}} />
    );
    fireEvent.click(screen.getByText('Upload Data'));
    expect(screen.getByText('Upload Usage Data')).toBeInTheDocument();
  });
});
