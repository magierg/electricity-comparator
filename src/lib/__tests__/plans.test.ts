import { WELLINGTON_PLANS } from '../../data/wellington-plans';
import {
  filterPlans,
  getProviderLabel,
  getProviderOptions,
  getRateSummary,
} from '../plans';

describe('plan helpers', () => {
  it('lists providers once, in alphabetical order', () => {
    const providers = getProviderOptions(WELLINGTON_PLANS);

    expect(providers).toContain('Contact Energy');
    expect(providers).toContain('Octopus Energy');
    expect(new Set(providers).size).toBe(providers.length);
    expect(providers).toEqual([...providers].sort((a, b) => a.localeCompare(b)));
  });

  it('hides a provider when it duplicates the plan name', () => {
    expect(getProviderLabel('Powershop', 'Powershop')).toBeUndefined();
    expect(getProviderLabel('2degrees Bundle', '2degrees')).toBeUndefined();
    expect(getProviderLabel('Contact Basic Plan', 'Contact Energy')).toBe(
      'Contact Energy',
    );
    expect(getProviderLabel('Contact', 'Contact Energy')).toBeUndefined();
    expect(getProviderLabel('Electric Kiwi', 'Electric Kiwi')).toBeUndefined();
  });

  it('summarises flat and time-of-use rates', () => {
    const flat = WELLINGTON_PLANS.find((plan) => plan.pricing === 'inclusive');
    const tou = WELLINGTON_PLANS.find((plan) => plan.pricing === 'peak-offpeak');
    const threeTier = WELLINGTON_PLANS.find(
      (plan) => plan.pricing === 'peak-shoulder-offpeak',
    );

    expect(getRateSummary(flat!, flat!.variants.standard!)).toContain('flat');
    expect(getRateSummary(tou!, tou!.variants.standard!)).toContain('peak');
    expect(getRateSummary(threeTier!, threeTier!.variants.standard!)).toContain(
      'shoulder',
    );
  });

  it('filters by user type, provider, and category', () => {
    const filtered = filterPlans(WELLINGTON_PLANS, {
      userType: 'standard',
      provider: 'Contact Energy',
      category: 'standard',
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every(
        (plan) => plan.provider === 'Contact Energy' && plan.category === 'standard',
      ),
    ).toBe(true);
  });

  it('excludes plans that are not available for the user type', () => {
    const lowOnly = filterPlans(WELLINGTON_PLANS, {
      userType: 'standard',
      provider: 'Meridian Energy',
      category: 'standard',
    });

    expect(lowOnly.some((plan) => plan.id.includes('meridian-2-year'))).toBe(false);
  });
});
