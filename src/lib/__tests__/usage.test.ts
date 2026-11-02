import {
  annualUsageFromPattern,
  averageHourlyUsage,
  createCustomUsage,
  createDefaultUsage,
  createUsageFromAnnual,
} from '../usage';

describe('usage helpers', () => {
  it('creates a flat annual estimate', () => {
    const usage = createUsageFromAnnual(3650, 'flat');

    expect(usage.totalDaily).toBeCloseTo(10);
    expect(usage.hourlyUsage).toHaveLength(24);
    expect(usage.hourlyUsage[0]).toBeCloseTo(10 / 24);
    expect(usage.hourlyUsage[23]).toBeCloseTo(10 / 24);
  });

  it('keeps the requested annual total for a shaped estimate', () => {
    const usage = createUsageFromAnnual(7300, 'evening');

    expect(usage.totalDaily).toBeCloseTo(20);
    expect(usage.hourlyUsage.reduce((sum, value) => sum + value, 0)).toBeCloseTo(20);
    expect(usage.hourlyUsage[18]).toBeGreaterThan(usage.hourlyUsage[3]);
  });

  it('creates custom usage and clamps negative values', () => {
    const usage = createCustomUsage([1, -2, 3]);

    expect(usage.hourlyUsage).toHaveLength(24);
    expect(usage.hourlyUsage[0]).toBe(1);
    expect(usage.hourlyUsage[1]).toBe(0);
    expect(usage.hourlyUsage[2]).toBe(3);
    expect(usage.totalDaily).toBe(4);
  });

  it('annualises a usage pattern', () => {
    const usage = createUsageFromAnnual(3650, 'flat');
    expect(annualUsageFromPattern(usage)).toBeCloseTo(3650);
    expect(averageHourlyUsage(usage)).toBeCloseTo(10 / 24);
  });

  it('provides a sensible default usage pattern', () => {
    const usage = createDefaultUsage();
    expect(usage.totalDaily).toBeCloseTo(7500 / 365);
  });
});
