import type {
  ElectricityPlan,
  PlanCategory,
  PlanVariant,
  PricingType,
  UserType,
} from '../types';
import { formatRate } from './format';

export const PRICING_LABELS: Record<PricingType, string> = {
  inclusive: 'Flat rate',
  'peak-offpeak': 'Peak & off-peak',
  'peak-shoulder-offpeak': 'Peak, shoulder & off-peak',
};

export function getPricingLabel(pricing: PricingType): string {
  return PRICING_LABELS[pricing];
}

export function getProviderLabel(
  planName: string,
  provider: string,
): string | undefined {
  const name = planName.toLowerCase();
  const providerName = provider.toLowerCase();
  if (
    name === providerName ||
    name.startsWith(providerName) ||
    providerName.startsWith(name)
  ) {
    return undefined;
  }
  return provider;
}

export function getProviderOptions(plans: ElectricityPlan[]): string[] {
  return Array.from(new Set(plans.map((plan) => plan.provider))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getRateSummary(
  plan: ElectricityPlan,
  variant: PlanVariant,
): string {
  if (plan.pricing === 'inclusive') {
    return `${formatRate(variant.inclusiveRate ?? 0)} flat`;
  }
  if (plan.pricing === 'peak-offpeak') {
    return `${formatRate(variant.peakRate ?? 0)} peak · ${formatRate(
      variant.offPeakRate ?? 0,
    )} off-peak`;
  }
  return `${formatRate(variant.peakRate ?? 0)} peak · ${formatRate(
    variant.shoulderRate ?? 0,
  )} shoulder · ${formatRate(variant.offPeakRate ?? 0)} off-peak`;
}

export function filterPlans(
  plans: ElectricityPlan[],
  options: {
    userType: UserType;
    provider: string;
    category: PlanCategory | 'all';
  },
): ElectricityPlan[] {
  return plans.filter((plan) => {
    if (!plan.variants[options.userType]) return false;
    if (options.provider !== 'all' && plan.provider !== options.provider) return false;
    if (options.category !== 'all' && plan.category !== options.category) return false;
    return true;
  });
}
