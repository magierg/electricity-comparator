import {
  annualUsageFromDaily,
  calculateAllPlanCosts,
  calculatePlanCost,
  getPlanName,
  isPlanAvailable,
  suggestUserType,
} from '../calculator';
import type {
  ElectricityPlan,
  PeakSchedule,
  PlanVariant,
  UsagePattern,
} from '../../types';

const usage: UsagePattern = {
  hourlyUsage: Array(24).fill(1),
  totalDaily: 24,
};

const schedule: PeakSchedule = {
  peak: [7, 8, 17, 18, 19, 20],
  shoulder: [9, 10, 11, 12, 13, 14, 15, 16, 21, 22],
};

function variant(overrides: Partial<PlanVariant> = {}): PlanVariant {
  return {
    dailyCharge: 1,
    levy: 0,
    ...overrides,
  };
}

function plan(
  id: string,
  pricing: ElectricityPlan['pricing'],
  overrides: {
    standard?: PlanVariant;
    low?: PlanVariant;
    category?: ElectricityPlan['category'];
  } = {},
): ElectricityPlan {
  return {
    id,
    provider: 'Test Provider',
    name: `Test ${id}`,
    category: overrides.category ?? 'standard',
    pricing,
    variants: {
      standard: overrides.standard,
      low: overrides.low,
    },
  };
}

describe('calculatePlanCost', () => {
  it('calculates a flat/inclusive plan', () => {
    const testPlan = plan('flat', 'inclusive', {
      standard: variant({ dailyCharge: 2, inclusiveRate: 0.25 }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(result).not.toBeNull();
    expect(result!.breakdown.inclusiveUsage).toBe(24);
    expect(result!.breakdown.energyCost).toBeCloseTo(6);
    expect(result!.breakdown.totalDaily).toBeCloseTo(8);
    expect(result!.breakdown.totalMonthly).toBeCloseTo((8 * 365) / 12);
    expect(result!.breakdown.totalYearly).toBeCloseTo(2920);
    expect(result!.breakdown.effectiveRate).toBeCloseTo(0.25);
  });

  it('calculates peak and off-peak usage', () => {
    const testPlan = plan('tou', 'peak-offpeak', {
      standard: variant({ peakRate: 0.4, offPeakRate: 0.2 }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(result!.breakdown.peakUsage).toBe(6);
    expect(result!.breakdown.shoulderUsage).toBe(0);
    expect(result!.breakdown.offPeakUsage).toBe(18);
    expect(result!.breakdown.peakCost).toBeCloseTo(2.4);
    expect(result!.breakdown.offPeakCost).toBeCloseTo(3.6);
    expect(result!.breakdown.energyCost).toBeCloseTo(6);
    expect(result!.breakdown.totalDaily).toBeCloseTo(7);
  });

  it('calculates a three-tier plan with shoulder usage', () => {
    const testPlan = plan('three-tier', 'peak-shoulder-offpeak', {
      standard: variant({
        peakRate: 0.5,
        shoulderRate: 0.3,
        offPeakRate: 0.15,
      }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(result!.breakdown.peakUsage).toBe(6);
    expect(result!.breakdown.shoulderUsage).toBe(10);
    expect(result!.breakdown.offPeakUsage).toBe(8);
    expect(result!.breakdown.energyCost).toBeCloseTo(7.2);
    expect(result!.breakdown.totalDaily).toBeCloseTo(8.2);
  });

  it('bills shoulder hours at off-peak on two-tier plans', () => {
    const testPlan = plan('two-tier', 'peak-offpeak', {
      standard: variant({ peakRate: 0.4, offPeakRate: 0.2 }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(result!.breakdown.peakUsage).toBe(6);
    expect(result!.breakdown.shoulderUsage).toBe(0);
    expect(result!.breakdown.offPeakUsage).toBe(18);
    expect(result!.breakdown.totalDaily).toBeCloseTo(7);
  });

  it('includes the EA levy in the energy cost', () => {
    const testPlan = plan('levy', 'inclusive', {
      standard: variant({ dailyCharge: 0, inclusiveRate: 0.2, levy: 0.01 }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(result!.breakdown.levyCost).toBeCloseTo(0.24);
    expect(result!.breakdown.energyCost).toBeCloseTo(4.8);
    expect(result!.breakdown.totalDaily).toBeCloseTo(5.04);
  });

  it('uses the low-user variant when requested', () => {
    const testPlan = plan('variants', 'inclusive', {
      low: variant({ dailyCharge: 0.5, inclusiveRate: 0.3 }),
      standard: variant({ dailyCharge: 1, inclusiveRate: 0.2 }),
    });

    const low = calculatePlanCost(usage, testPlan, 'low', schedule);
    const standard = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(low!.breakdown.totalDaily).toBeCloseTo(7.7);
    expect(standard!.breakdown.totalDaily).toBeCloseTo(5.8);
    expect(getPlanName(testPlan, 'low')).toBe('Test variants');
    expect(getPlanName(testPlan, 'standard')).toBe('Test variants');
  });

  it('returns null when the user type is not offered', () => {
    const testPlan = plan('standard-only', 'inclusive', {
      standard: variant({ inclusiveRate: 0.2 }),
    });

    expect(calculatePlanCost(usage, testPlan, 'low', schedule)).toBeNull();
    expect(isPlanAvailable(testPlan, 'standard')).toBe(true);
    expect(isPlanAvailable(testPlan, 'low')).toBe(false);
  });

  it('applies cash and percentage discounts to the first year', () => {
    const testPlan = plan('discount', 'inclusive', {
      standard: variant({
        dailyCharge: 0,
        inclusiveRate: 0.25,
        cashDiscount: 100,
        percentDiscount: 10,
      }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);

    expect(result!.breakdown.totalYearly).toBeCloseTo(2190);
    expect(result!.firstYearEstimate).toBeCloseTo(2190 - 100 - 219);
  });

  it('handles zero usage without dividing by zero', () => {
    const testPlan = plan('zero', 'inclusive', {
      standard: variant({ dailyCharge: 1, inclusiveRate: 0.25 }),
    });
    const emptyUsage: UsagePattern = {
      hourlyUsage: Array(24).fill(0),
      totalDaily: 0,
    };

    const result = calculatePlanCost(emptyUsage, testPlan, 'standard', schedule);

    expect(result!.breakdown.effectiveRate).toBe(0);
    expect(result!.breakdown.totalDaily).toBe(1);
  });

  it('scales the free-power value from the benchmark to annual usage', () => {
    const testPlan = plan('free-power', 'inclusive', {
      standard: variant({
        dailyCharge: 0,
        inclusiveRate: 0.2,
        freePowerValue: 100,
        freePowerBenchmarkKwh: 10_000,
      }),
    });

    const result = calculatePlanCost(usage, testPlan, 'standard', schedule);
    const expectedDiscount = 100 * ((24 * 365) / 10_000);

    expect(result!.freePowerDiscount).toBeCloseTo(expectedDiscount);
    expect(result!.firstYearEstimate).toBeCloseTo(
      result!.breakdown.totalYearly - expectedDiscount,
    );
  });

  it('uses the variant-specific display name when present', () => {
    const testPlan = plan('named', 'inclusive', {
      standard: variant({ inclusiveRate: 0.2 }),
      low: variant({ inclusiveRate: 0.2, name: 'Low name' }),
    });

    expect(getPlanName(testPlan, 'low')).toBe('Low name');
    expect(getPlanName(testPlan, 'standard')).toBe('Test named');
  });
});

describe('calculateAllPlanCosts', () => {
  it('filters unavailable plans and sorts by annual cost', () => {
    const cheap = plan('cheap', 'inclusive', {
      standard: variant({ dailyCharge: 1, inclusiveRate: 0.1 }),
    });
    const expensive = plan('expensive', 'inclusive', {
      standard: variant({ dailyCharge: 1, inclusiveRate: 0.3 }),
    });
    const unavailable = plan('unavailable', 'inclusive', {
      low: variant({ dailyCharge: 1, inclusiveRate: 0.1 }),
    });

    const results = calculateAllPlanCosts(
      usage,
      [expensive, unavailable, cheap],
      'standard',
      schedule,
    );

    expect(results).toHaveLength(2);
    expect(results[0].plan.id).toBe('cheap');
    expect(results[1].plan.id).toBe('expensive');
  });
});

describe('usage and user type helpers', () => {
  it('suggests low user below 8,000 kWh and standard at 8,000+', () => {
    expect(suggestUserType(7999)).toBe('low');
    expect(suggestUserType(8000)).toBe('standard');
  });

  it('annualises a daily total', () => {
    expect(annualUsageFromDaily(usage)).toBe(24 * 365);
  });
});
