import { DAYS_PER_MONTH, DAYS_PER_YEAR, LOW_USER_THRESHOLD } from '../constants';
import type {
  CostBreakdown,
  ElectricityPlan,
  PeakSchedule,
  PlanCostResult,
  PlanVariant,
  UsagePattern,
  UserType,
} from '../types';

export function getVariant(
  plan: ElectricityPlan,
  userType: UserType,
): PlanVariant | undefined {
  return plan.variants[userType];
}

export function getPlanName(plan: ElectricityPlan, userType: UserType): string {
  return plan.variants[userType]?.name ?? plan.name;
}

export function isPlanAvailable(plan: ElectricityPlan, userType: UserType): boolean {
  return Boolean(plan.variants[userType]);
}

export function suggestUserType(annualKwh: number): UserType {
  return annualKwh < LOW_USER_THRESHOLD ? 'low' : 'standard';
}

export function calculatePlanCost(
  usage: UsagePattern,
  plan: ElectricityPlan,
  userType: UserType,
  schedule: PeakSchedule,
): PlanCostResult | null {
  const variant = plan.variants[userType];
  if (!variant) return null;

  const peakHours = new Set(schedule.peak);
  const shoulderHours = new Set(schedule.shoulder);
  const hasShoulderRate =
    plan.pricing === 'peak-shoulder-offpeak' && variant.shoulderRate !== undefined;

  let inclusiveUsage = 0;
  let inclusiveCost = 0;
  let peakUsage = 0;
  let peakCost = 0;
  let shoulderUsage = 0;
  let shoulderCost = 0;
  let offPeakUsage = 0;
  let offPeakCost = 0;

  for (let hour = 0; hour < 24; hour += 1) {
    const kWh = usage.hourlyUsage[hour] ?? 0;
    if (kWh <= 0) continue;

    if (plan.pricing === 'inclusive') {
      inclusiveUsage += kWh;
      inclusiveCost += kWh * (variant.inclusiveRate ?? 0);
    } else if (peakHours.has(hour)) {
      peakUsage += kWh;
      peakCost += kWh * (variant.peakRate ?? variant.offPeakRate ?? 0);
    } else if (hasShoulderRate && shoulderHours.has(hour)) {
      shoulderUsage += kWh;
      shoulderCost += kWh * (variant.shoulderRate ?? 0);
    } else {
      offPeakUsage += kWh;
      offPeakCost += kWh * (variant.offPeakRate ?? variant.peakRate ?? 0);
    }
  }

  const totalUsage = inclusiveUsage + peakUsage + shoulderUsage + offPeakUsage;
  const energyCost = inclusiveCost + peakCost + shoulderCost + offPeakCost;
  const levyCost = totalUsage * variant.levy;
  const totalDaily = energyCost + levyCost + variant.dailyCharge;

  const breakdown: CostBreakdown = {
    inclusiveUsage,
    inclusiveCost,
    peakUsage,
    peakCost,
    shoulderUsage,
    shoulderCost,
    offPeakUsage,
    offPeakCost,
    totalUsage,
    energyCost,
    levyCost,
    dailyCharge: variant.dailyCharge,
    totalDaily,
    totalMonthly: totalDaily * DAYS_PER_MONTH,
    totalYearly: totalDaily * DAYS_PER_YEAR,
    effectiveRate: totalUsage > 0 ? (energyCost + levyCost) / totalUsage : 0,
  };

  const percentageDiscount = (breakdown.totalYearly * (variant.percentDiscount ?? 0)) / 100;
  const freePowerDiscount =
    variant.freePowerValue && variant.freePowerBenchmarkKwh
      ? variant.freePowerValue * (totalUsage / variant.freePowerBenchmarkKwh)
      : 0;
  const firstYearEstimate = Math.max(
    0,
    breakdown.totalYearly -
      (variant.cashDiscount ?? 0) -
      percentageDiscount -
      freePowerDiscount,
  );

  return {
    plan,
    variant,
    userType,
    planName: getPlanName(plan, userType),
    breakdown,
    freePowerDiscount,
    firstYearEstimate,
  };
}

export function calculateAllPlanCosts(
  usage: UsagePattern,
  plans: ElectricityPlan[],
  userType: UserType,
  schedule: PeakSchedule,
): PlanCostResult[] {
  return plans
    .map((plan) => calculatePlanCost(usage, plan, userType, schedule))
    .filter((result): result is PlanCostResult => result !== null)
    .sort((a, b) => a.breakdown.totalYearly - b.breakdown.totalYearly);
}

export function annualUsageFromDaily(usage: UsagePattern): number {
  return usage.totalDaily * DAYS_PER_YEAR;
}
