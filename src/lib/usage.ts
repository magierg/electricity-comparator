import { DAYS_PER_YEAR, TYPICAL_ANNUAL_KWH } from '../constants';
import type { UsagePattern } from '../types';

export type UsageShape = 'evening' | 'daytime' | 'flat';

export interface UsageShapeOption {
  value: UsageShape;
  label: string;
  description: string;
  hourly: number[];
}

const EVENING_SHAPE = [
  0.5, 0.4, 0.3, 0.3, 0.4, 0.8, 1.2, 1.0, 0.8, 0.6, 0.5, 0.5,
  0.6, 0.7, 0.8, 0.9, 1.5, 2.0, 2.5, 2.2, 1.8, 1.4, 1.0, 0.7,
];

const DAYTIME_SHAPE = [
  0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 1.0, 2.0, 2.5, 2.8, 3.0,
  2.5, 2.8, 3.0, 2.8, 2.5, 2.0, 1.5, 1.0, 0.5, 0.3, 0.2, 0.2,
];

function normalize(shape: number[]): number[] {
  const total = shape.reduce((sum, value) => sum + value, 0);
  return shape.map((value) => value / total);
}

const NORMALIZED_SHAPES: Record<UsageShape, number[]> = {
  evening: normalize(EVENING_SHAPE),
  daytime: normalize(DAYTIME_SHAPE),
  flat: normalize(new Array(24).fill(1)),
};

export const USAGE_SHAPES: UsageShapeOption[] = [
  {
    value: 'evening',
    label: 'Evening-heavy',
    description: 'Typical household with morning and evening peaks',
    hourly: NORMALIZED_SHAPES.evening,
  },
  {
    value: 'daytime',
    label: 'Daytime-heavy',
    description: 'Working from home or daytime business use',
    hourly: NORMALIZED_SHAPES.daytime,
  },
  {
    value: 'flat',
    label: 'Flat',
    description: 'Roughly the same usage every hour',
    hourly: NORMALIZED_SHAPES.flat,
  },
];

export function createUsageFromAnnual(
  annualKwh: number,
  shape: UsageShape,
): UsagePattern {
  const dailyKwh = Math.max(0, annualKwh) / DAYS_PER_YEAR;
  const hourlyUsage = NORMALIZED_SHAPES[shape].map((share) => share * dailyKwh);
  return {
    hourlyUsage,
    totalDaily: dailyKwh,
  };
}

export function createCustomUsage(hourlyUsage: number[]): UsagePattern {
  const normalized = Array.from({ length: 24 }, (_, hour) =>
    Math.max(0, hourlyUsage[hour] ?? 0),
  );
  return {
    hourlyUsage: normalized,
    totalDaily: normalized.reduce((sum, value) => sum + value, 0),
  };
}

export function annualUsageFromPattern(usage: UsagePattern): number {
  return usage.totalDaily * DAYS_PER_YEAR;
}

export function averageHourlyUsage(usage: UsagePattern): number {
  return usage.totalDaily / 24;
}

export function createDefaultUsage(): UsagePattern {
  return createUsageFromAnnual(TYPICAL_ANNUAL_KWH, 'evening');
}
