import { PLAN_DATA_META, WELLINGTON_PLANS } from '../wellington-plans';

describe('Wellington plan data', () => {
  it('contains 17 unique plans', () => {
    expect(WELLINGTON_PLANS).toHaveLength(17);
    expect(new Set(WELLINGTON_PLANS.map((plan) => plan.id)).size).toBe(17);
  });

  it('has metadata describing the source and GST treatment', () => {
    expect(PLAN_DATA_META.region).toBe('Wellington');
    expect(PLAN_DATA_META.source).toContain('MoneyHub');
    expect(PLAN_DATA_META.sourceDate).toBe('October 2026');
    expect(PLAN_DATA_META.ratesIncludeGst).toBe(true);
    expect(PLAN_DATA_META.gstRate).toBe(0.15);
  });

  it('offers every plan to at least one user type', () => {
    for (const plan of WELLINGTON_PLANS) {
      expect(
        Boolean(plan.variants.low) || Boolean(plan.variants.standard),
      ).toBe(true);
    }
  });

  it('has the expected number of plans available to each user type', () => {
    expect(
      WELLINGTON_PLANS.filter((plan) => plan.variants.standard),
    ).toHaveLength(14);
    expect(WELLINGTON_PLANS.filter((plan) => plan.variants.low)).toHaveLength(13);
  });

  it('includes the expected plan categories', () => {
    expect(WELLINGTON_PLANS.filter((plan) => plan.category === 'ev')).toHaveLength(2);
    expect(WELLINGTON_PLANS.filter((plan) => plan.category === 'bundle')).toHaveLength(3);
    expect(
      WELLINGTON_PLANS.filter((plan) => plan.category === 'standard'),
    ).toHaveLength(12);
  });

  it('has finite, non-negative rates and positive daily charges', () => {
    for (const plan of WELLINGTON_PLANS) {
      for (const variant of Object.values(plan.variants)) {
        expect(variant.dailyCharge).toBeGreaterThan(0);
        expect(Number.isFinite(variant.dailyCharge)).toBe(true);
        expect(Number.isFinite(variant.levy)).toBe(true);
        for (const rate of [
          variant.inclusiveRate,
          variant.peakRate,
          variant.shoulderRate,
          variant.offPeakRate,
        ]) {
          if (rate !== undefined) {
            expect(Number.isFinite(rate)).toBe(true);
            expect(rate).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it('stores GST-inclusive rates from the source data', () => {
    const contactBasic = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'contact-energy-contact-basic-plan',
    );
    expect(contactBasic?.variants.standard?.dailyCharge).toBeCloseTo(2.645);
    expect(contactBasic?.variants.standard?.inclusiveRate).toBeCloseTo(0.2599);
    expect(contactBasic?.variants.standard?.levy).toBeCloseTo(0.002185);

    const contactEv = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'contact-energy-contact-ev-good-charge',
    );
    expect(contactEv?.variants.standard?.dailyCharge).toBeCloseTo(2.99);
    expect(contactEv?.variants.standard?.peakRate).toBeCloseTo(0.33695);
  });

  it('keeps single-user-type plans marked correctly', () => {
    const meridian2Year = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'meridian-energy-meridian-2-year-contract',
    );
    expect(meridian2Year?.variants.standard).toBeUndefined();
    expect(meridian2Year?.variants.low).toBeDefined();

    const sundaySaver = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'electric-kiwi-electric-kiwi-sunday-saver',
    );
    expect(sundaySaver?.variants.standard).toBeDefined();
    expect(sundaySaver?.variants.low).toBeUndefined();
  });

  it('uses the low-user plan name where the retailer differs', () => {
    const genesisPowerHome = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'genesis-energy-genesis-powerhome',
    );
    expect(genesisPowerHome?.name).toBe('Genesis PowerHome');
    expect(genesisPowerHome?.variants.low?.name).toBe('Genesis Energy Plus');
  });

  it('stores discount and free-power information', () => {
    const twoDegrees = WELLINGTON_PLANS.find(
      (plan) => plan.id === '2degrees-2degrees-bundle',
    );
    expect(twoDegrees?.variants.standard?.cashDiscount).toBe(180);
    expect(twoDegrees?.variants.standard?.percentDiscount).toBe(10);

    const electricKiwi = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'electric-kiwi-electric-kiwi-everyday',
    );
    expect(electricKiwi?.variants.standard?.freePowerValue).toBeGreaterThan(0);
    expect(electricKiwi?.variants.standard?.freePowerBenchmarkKwh).toBe(9094);
  });

  it('matches the MoneyHub annual estimate for a known flat plan', () => {
    const contactBasic = WELLINGTON_PLANS.find(
      (plan) => plan.id === 'contact-energy-contact-basic-plan',
    );
    const variant = contactBasic?.variants.standard;
    expect(variant).toBeDefined();

    const annual =
      9094 *
        ((variant?.inclusiveRate ?? 0) + (variant?.levy ?? 0)) +
      (variant?.dailyCharge ?? 0) * 365;

    expect(annual).toBeCloseTo(variant?.sourceAnnualEstimate ?? 0, 0);
  });
});
