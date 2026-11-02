import type { PeakSchedule } from './types';

export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 365 / 12;

/** North Island low-user threshold, kWh per year. */
export const LOW_USER_THRESHOLD = 8000;

/** A typical household starts here before the user enters their own usage. */
export const TYPICAL_ANNUAL_KWH = 7500;

export const SAMPLE_DATA_URL =
  '/data/0000152727TRFFB_meter_usage_data_2025-06-01_to_2025-06-30.csv';

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const PEAK_PRESETS: Record<
  string,
  { label: string; description: string; schedule: PeakSchedule }
> = {
  threeTier: {
    label: 'Peak + shoulder',
    description: '7–9am & 5–8pm peak, 9am–5pm & 9–10pm shoulder',
    schedule: {
      peak: [7, 8, 17, 18, 19, 20],
      shoulder: [9, 10, 11, 12, 13, 14, 15, 16, 21, 22],
    },
  },
  morningEvening: {
    label: 'Morning + evening',
    description: '7–9am & 5–9pm peak, everything else off-peak',
    schedule: {
      peak: [7, 8, 17, 18, 19, 20, 21],
      shoulder: [],
    },
  },
  evening: {
    label: 'Evening only',
    description: '5–9pm peak, everything else off-peak',
    schedule: {
      peak: [17, 18, 19, 20, 21],
      shoulder: [],
    },
  },
};

export const DEFAULT_PEAK_SCHEDULE = PEAK_PRESETS.threeTier.schedule;

export const CHART_COLORS = {
  peak: 'rgba(245, 158, 11, 0.85)',
  peakBorder: 'rgba(217, 119, 6, 1)',
  shoulder: 'rgba(124, 58, 237, 0.8)',
  shoulderBorder: 'rgba(109, 40, 217, 1)',
  offPeak: 'rgba(148, 163, 184, 0.8)',
  offPeakBorder: 'rgba(100, 116, 139, 1)',
} as const;

