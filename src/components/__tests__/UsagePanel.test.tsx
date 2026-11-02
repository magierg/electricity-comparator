import { fireEvent, render, screen } from '@testing-library/react';
import { createDefaultUsage } from '../../lib/usage';
import type { UsageSource } from '../../types';
import UsagePanel from '../UsagePanel';

const usage = createDefaultUsage();
const estimateSource: UsageSource = { kind: 'estimate', label: 'Evening estimate' };
const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = jest.fn(
    () =>
      new Promise(() => {
        // Keep the upload panel in its loading state for this test.
      }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('UsagePanel', () => {
  it('emits an annual estimate when the value or shape changes', () => {
    const onUsageChange = jest.fn();
    render(
      <UsagePanel usage={usage} source={estimateSource} onUsageChange={onUsageChange} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /annual estimate/i }));
    fireEvent.change(screen.getByLabelText(/annual usage/i), {
      target: { value: '4000' },
    });
    expect(onUsageChange).toHaveBeenCalled();
    expect(onUsageChange.mock.calls.at(-1)?.[1].label).toMatch(/evening-heavy estimate/i);

    fireEvent.click(screen.getByRole('radio', { name: /daytime-heavy/i }));
    expect(onUsageChange.mock.calls.at(-1)?.[1].label).toMatch(/daytime-heavy estimate/i);
  });

  it('emits custom hourly usage', () => {
    const onUsageChange = jest.fn();
    render(
      <UsagePanel usage={usage} source={estimateSource} onUsageChange={onUsageChange} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /custom hours/i }));
    const firstHour = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(firstHour, { target: { value: '1.25' } });

    const [nextUsage, nextSource] = onUsageChange.mock.calls.at(-1)!;
    expect(nextUsage.totalDaily).toBeGreaterThan(usage.totalDaily);
    expect(nextSource.kind).toBe('custom');
  });

  it('shows the number of uploaded days when present', () => {
    render(
      <UsagePanel
        usage={usage}
        source={{ kind: 'upload', label: 'Uploaded data', days: 2 }}
        onUsageChange={jest.fn()}
      />,
    );

    expect(screen.getByText(/2 days/i)).toBeInTheDocument();
  });

  it('renders the upload panel by default', () => {
    render(
      <UsagePanel usage={usage} source={estimateSource} onUsageChange={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: /upload meter csv/i })).toBeInTheDocument();
  });
});
