import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DataUpload from '../DataUpload';

function halfHourLabels(): string[] {
  const labels: string[] = [];
  for (let interval = 0; interval < 48; interval += 1) {
    const startHour = Math.floor(interval / 2);
    const startMinute = interval % 2 === 0 ? '00' : '30';
    const endInterval = interval + 1;
    const endHour = Math.floor(endInterval / 2) % 24;
    const endMinute = endInterval % 2 === 0 ? '00' : '30';
    labels.push(
      `${String(startHour).padStart(2, '0')}:${startMinute} - ${String(endHour).padStart(2, '0')}:${endMinute}`,
    );
  }
  return labels;
}

function meterCsv(): string {
  return [
    ['ICP', 'Meter number', 'Meter element', 'Date', ...halfHourLabels()].join(','),
    ['ICP1', 'METER1', 'Consumption', '1/6/2025', ...Array(48).fill(1)].join(','),
  ].join('\n');
}

describe('DataUpload', () => {
  it('renders the upload and sample buttons', () => {
    render(<DataUpload onUsageChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: /upload meter csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use sample data/i })).toBeInTheDocument();
  });

  it('parses an uploaded meter CSV and reports the average usage', async () => {
    const onUsageChange = jest.fn();
    const { container } = render(<DataUpload onUsageChange={onUsageChange} />);

    const file = new File([meterCsv()], 'usage.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => expect(onUsageChange).toHaveBeenCalled());

    const [usage, source] = onUsageChange.mock.calls[0];
    expect(usage.totalDaily).toBe(48);
    expect(usage.hourlyUsage).toHaveLength(24);
    expect(source.kind).toBe('upload');
    expect(await screen.findByText(/usage data loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/48 kWh average per day/i)).toBeInTheDocument();
  });

  it('shows an error for an invalid CSV', async () => {
    const { container } = render(<DataUpload onUsageChange={jest.fn()} />);

    const file = new File(['not,a,valid,csv\n1,2,3,4'], 'invalid.csv', {
      type: 'text/csv',
    });
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid csv format/i);
  });
});
