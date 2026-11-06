import { fireEvent, render, screen, within } from '@testing-library/react';
import { DEFAULT_PEAK_SCHEDULE, PEAK_PRESETS } from '../../constants';
import PeakScheduleSettings from '../PeakScheduleSettings';

describe('PeakScheduleSettings', () => {
  it('toggles a peak hour off', () => {
    const onChange = jest.fn();
    render(<PeakScheduleSettings schedule={DEFAULT_PEAK_SCHEDULE} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /customise/i }));
    const peakGroup = screen.getByRole('group', { name: /peak hours/i });
    fireEvent.click(within(peakGroup).getByRole('button', { name: '07' }));

    expect(onChange).toHaveBeenCalledWith({
      peak: [8, 17, 18, 19, 20],
      shoulder: DEFAULT_PEAK_SCHEDULE.shoulder,
    });
  });

  it('toggles a shoulder hour off', () => {
    const onChange = jest.fn();
    render(<PeakScheduleSettings schedule={DEFAULT_PEAK_SCHEDULE} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /customise/i }));
    const shoulderGroup = screen.getByRole('group', { name: /shoulder hours/i });
    fireEvent.click(within(shoulderGroup).getByRole('button', { name: '09' }));

    expect(onChange).toHaveBeenCalledWith({
      peak: DEFAULT_PEAK_SCHEDULE.peak,
      shoulder: [10, 11, 12, 13, 14, 15, 16, 21, 22],
    });
  });

  it('moves a shoulder hour out of peak when selected', () => {
    const onChange = jest.fn();
    render(<PeakScheduleSettings schedule={{ peak: [7], shoulder: [] }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /customise/i }));
    const shoulderGroup = screen.getByRole('group', { name: /shoulder hours/i });
    fireEvent.click(within(shoulderGroup).getByRole('button', { name: '07' }));

    expect(onChange).toHaveBeenCalledWith({ peak: [], shoulder: [7] });
  });

  it('applies a preset and can collapse the editor', () => {
    const onChange = jest.fn();
    render(<PeakScheduleSettings schedule={DEFAULT_PEAK_SCHEDULE} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /evening only/i }));
    expect(onChange).toHaveBeenCalledWith(PEAK_PRESETS.evening.schedule);

    fireEvent.click(screen.getByRole('button', { name: /customise/i }));
    expect(screen.getByText('Peak hours')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^hide$/i }));
    expect(screen.queryByText('Peak hours')).not.toBeInTheDocument();
  });

  it('resets a customised schedule to the default', () => {
    const onChange = jest.fn();
    render(<PeakScheduleSettings schedule={{ peak: [7], shoulder: [] }} onChange={onChange} />);

    const reset = screen.getByRole('button', { name: /reset/i });
    expect(reset).toBeEnabled();
    fireEvent.click(reset);

    expect(onChange).toHaveBeenCalledWith(DEFAULT_PEAK_SCHEDULE);
  });

  it('disables reset when the schedule is already the default', () => {
    render(<PeakScheduleSettings schedule={DEFAULT_PEAK_SCHEDULE} onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
  });

  it('shows none when the schedule is empty', () => {
    render(<PeakScheduleSettings schedule={{ peak: [], shoulder: [] }} onChange={jest.fn()} />);

    expect(screen.getByText(/peak: none/i)).toBeInTheDocument();
    expect(screen.getByText(/shoulder: none/i)).toBeInTheDocument();
  });
});
