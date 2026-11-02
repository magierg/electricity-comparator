export type UserType = 'low' | 'standard';
export type PlanCategory = 'standard' | 'ev' | 'bundle';
export type PricingType = 'inclusive' | 'peak-offpeak' | 'peak-shoulder-offpeak';

/**
 * A plan as offered to one user type. All money values are GST-inclusive
 * NZD, matching the source data.
 */
export interface PlanVariant {
  /** Some retailers use a different plan name for low users. */
  name?: string;
  dailyCharge: number;
  inclusiveRate?: number;
  peakRate?: number;
  shoulderRate?: number;
  offPeakRate?: number;
  /** Electricity Authority levy, dollars per kWh. */
  levy: number;
  contractTerm?: string;
  discount?: string;
  cashDiscount?: number;
  percentDiscount?: number;
  /** GST-inclusive value of free-power hours at the source benchmark usage. */
  freePowerValue?: number;
  freePowerBenchmarkKwh?: number;
  sourceAnnualEstimate?: number;
  sourceAnnualAfterDiscounts?: number;
}

export interface ElectricityPlan {
  id: string;
  provider: string;
  name: string;
  category: PlanCategory;
  pricing: PricingType;
  variants: Partial<Record<UserType, PlanVariant>>;
}

export interface PlanDataMeta {
  region: string;
  source: string;
  sourceDate: string;
  ratesIncludeGst: boolean;
  gstRate: number;
  generatedAt: string;
}

export interface UsagePattern {
  /** kWh used in each hour of a representative day, indexed 0–23. */
  hourlyUsage: number[];
  totalDaily: number;
}

export interface UsageSource {
  kind: 'estimate' | 'custom' | 'upload' | 'sample';
  label: string;
  days?: number;
  dateRange?: { start: string; end: string };
}

export interface PeakSchedule {
  /** Hours billed at the peak rate. */
  peak: number[];
  /** Hours billed at the shoulder rate when a plan has one. */
  shoulder: number[];
}

export interface CostBreakdown {
  inclusiveUsage: number;
  inclusiveCost: number;
  peakUsage: number;
  shoulderUsage: number;
  offPeakUsage: number;
  totalUsage: number;
  peakCost: number;
  shoulderCost: number;
  offPeakCost: number;
  energyCost: number;
  levyCost: number;
  dailyCharge: number;
  totalDaily: number;
  totalMonthly: number;
  totalYearly: number;
  effectiveRate: number;
}

export interface PlanCostResult {
  plan: ElectricityPlan;
  variant: PlanVariant;
  userType: UserType;
  planName: string;
  breakdown: CostBreakdown;
  /** Estimated value of free-power hours at the user's usage. */
  freePowerDiscount: number;
  /** Annual estimate after one-off credits, percentage discounts, and free power. */
  firstYearEstimate: number;
}
