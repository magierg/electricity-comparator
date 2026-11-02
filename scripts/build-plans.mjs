import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const csvPath = path.join(root, 'data', 'october_2026_moneyhub_wellington.csv');
const outputPath = path.join(root, 'src', 'data', 'wellington-plans.ts');

const GST_FACTOR = 1.15;
const STANDARD_BENCHMARK_KWH = 9094;
const LOW_BENCHMARK_KWH = 7094;
const TWO_TIER_SHARES = { peak: 0.31, offPeak: 0.69 };
const THREE_TIER_SHARES = { peak: 0.45, shoulder: 0.28, offPeak: 0.27 };

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  let text = String(value).replace(/\u00a0/g, ' ').trim();
  if (!text || text === '-' || text === '$-' || text === '$ -') return null;
  if (text.startsWith('#')) return null;
  text = text.replace(/[$%\s,]/g, '');
  if (!text || text === '-') return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanContractTerm(value) {
  const text = cleanText(value);
  if (!text || text.startsWith('#') || text === '-' || text === '0') return undefined;
  return text;
}

function cleanDiscountDescription(value) {
  const text = cleanText(value);
  if (!text || text === '.' || text === '0' || text.startsWith('#')) return undefined;
  return text;
}

function normalizePercent(value) {
  if (value === null || value === undefined || value === 0) return undefined;
  return value > 0 && value <= 1 ? value * 100 : value;
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function toGstInclusive(value) {
  return value === null || value === undefined ? undefined : value * GST_FACTOR;
}

const SECTIONS = {
  standard: {
    nameRow: 1,
    contractRow: 2,
    dailyRow: 7,
    levyRow: 8,
    inclusiveRow: 9,
    peakRow: 10,
    offPeakRow: 11,
    threeTierPeakRow: 12,
    shoulderRow: 13,
    nightRow: 14,
    cashDiscountRow: 15,
    percentDiscountRow: 16,
    discountDescriptionRow: 17,
    freePowerRow: 21,
    summaryDailyRow: 23,
    annualRow: 25,
    annualAfterDiscountsRow: 26,
    benchmarkKwh: STANDARD_BENCHMARK_KWH,
  },
  low: {
    nameRow: 83,
    contractRow: 84,
    dailyRow: 89,
    levyRow: 90,
    inclusiveRow: 91,
    peakRow: 92,
    offPeakRow: 93,
    threeTierPeakRow: 94,
    shoulderRow: 95,
    nightRow: 96,
    cashDiscountRow: 97,
    percentDiscountRow: 98,
    discountDescriptionRow: 99,
    freePowerRow: null,
    summaryDailyRow: 102,
    annualRow: 104,
    annualAfterDiscountsRow: 105,
    benchmarkKwh: LOW_BENCHMARK_KWH,
  },
};

const PLAN_DEFS = [
  {
    id: 'contact-energy-contact-ev-good-charge',
    provider: 'Contact Energy',
    name: 'Contact EV - Good Charge',
    category: 'ev',
    pricing: 'peak-offpeak',
    standard: 4,
    low: 4,
  },
  {
    id: 'genesis-energy-genesis-evhome',
    provider: 'Genesis Energy',
    name: 'Genesis EVHome',
    category: 'ev',
    pricing: 'peak-offpeak',
    standard: 5,
    low: 5,
    lowName: 'Genesis EV Plan',
  },
  {
    id: 'contact-energy-contact-basic-plan',
    provider: 'Contact Energy',
    name: 'Contact Basic Plan',
    category: 'standard',
    pricing: 'inclusive',
    standard: 6,
    low: 6,
    lowName: 'Contact Basic',
  },
  {
    id: 'electric-kiwi-electric-kiwi-everyday',
    provider: 'Electric Kiwi',
    name: 'Electric Kiwi - Everyday',
    category: 'standard',
    pricing: 'peak-offpeak',
    standard: 7,
    low: 7,
    lowName: 'Electric Kiwi - Kiwi',
  },
  {
    id: 'electric-kiwi-electric-kiwi-movemaster',
    provider: 'Electric Kiwi',
    name: 'Electric Kiwi - MoveMaster',
    category: 'standard',
    pricing: 'peak-shoulder-offpeak',
    standard: 8,
    low: 8,
  },
  {
    id: 'electric-kiwi-electric-kiwi-sunday-saver',
    provider: 'Electric Kiwi',
    name: 'Electric Kiwi - Sunday Saver',
    category: 'bundle',
    pricing: 'peak-offpeak',
    standard: 9,
    low: null,
  },
  {
    id: 'genesis-energy-genesis-powerhome',
    provider: 'Genesis Energy',
    name: 'Genesis PowerHome',
    category: 'standard',
    pricing: 'inclusive',
    standard: 10,
    low: 10,
    lowName: 'Genesis Energy Plus',
  },
  {
    id: 'meridian-energy-meridian-freedom',
    provider: 'Meridian Energy',
    name: 'Meridian Freedom',
    category: 'standard',
    pricing: 'inclusive',
    standard: 11,
    low: null,
  },
  {
    id: 'meridian-energy-meridian-night-saver',
    provider: 'Meridian Energy',
    name: 'Meridian Night Saver',
    category: 'standard',
    pricing: 'peak-offpeak',
    standard: 12,
    low: null,
  },
  {
    id: 'meridian-energy-meridian-2-year-contract',
    provider: 'Meridian Energy',
    name: 'Meridian 2-year contract',
    category: 'standard',
    pricing: 'inclusive',
    standard: null,
    low: 11,
    contractTerm: 'Fixed (24 months)',
  },
  {
    id: 'meridian-energy-meridian-no-fixed-term',
    provider: 'Meridian Energy',
    name: 'Meridian No Fixed Term',
    category: 'standard',
    pricing: 'inclusive',
    standard: null,
    low: 12,
    contractTerm: 'Open',
  },
  {
    id: 'octopus-energy-octopus-free-lunch',
    provider: 'Octopus Energy',
    name: 'Octopus Free Lunch',
    category: 'standard',
    pricing: 'peak-shoulder-offpeak',
    standard: 13,
    low: null,
  },
  {
    id: 'octopus-energy-octopus-flexi',
    provider: 'Octopus Energy',
    name: 'Octopus Flexi',
    category: 'standard',
    pricing: 'peak-shoulder-offpeak',
    standard: 14,
    low: 13,
  },
  {
    id: 'octopus-energy-octopus-peaker',
    provider: 'Octopus Energy',
    name: 'Octopus Peaker',
    category: 'standard',
    pricing: 'peak-shoulder-offpeak',
    standard: null,
    low: 14,
    contractTerm: 'Open',
  },
  {
    id: 'powershop-powershop',
    provider: 'Powershop',
    name: 'Powershop',
    category: 'standard',
    pricing: 'inclusive',
    standard: 15,
    low: 15,
  },
  {
    id: 'contact-energy-contact-broadband-bundle',
    provider: 'Contact Energy',
    name: 'Contact Broadband Bundle',
    category: 'bundle',
    pricing: 'inclusive',
    standard: 17,
    low: 17,
  },
  {
    id: '2degrees-2degrees-bundle',
    provider: '2degrees',
    name: '2degrees Bundle',
    category: 'bundle',
    pricing: 'inclusive',
    standard: 18,
    low: 18,
  },
];

function readVariant(rows, section, column, pricing, fallbackContractTerm) {
  const daily = parseNumber(rows[section.dailyRow]?.[column]);
  if (daily === null || daily <= 0) return null;

  const levy = parseNumber(rows[section.levyRow]?.[column]) ?? 0;
  const inclusive = toGstInclusive(parseNumber(rows[section.inclusiveRow]?.[column]));
  const peak = toGstInclusive(parseNumber(rows[section.peakRow]?.[column]));
  const offPeak = toGstInclusive(parseNumber(rows[section.offPeakRow]?.[column]));
  const threeTierPeak = toGstInclusive(parseNumber(rows[section.threeTierPeakRow]?.[column]));
  const shoulder = toGstInclusive(parseNumber(rows[section.shoulderRow]?.[column]));
  const night = toGstInclusive(parseNumber(rows[section.nightRow]?.[column]));

  let rates;
  if (pricing === 'inclusive') {
    if (inclusive === undefined) return null;
    rates = { inclusiveRate: inclusive };
  } else if (pricing === 'peak-offpeak') {
    if (peak === undefined || offPeak === undefined) return null;
    rates = { peakRate: peak, offPeakRate: offPeak };
  } else {
    if (threeTierPeak === undefined || shoulder === undefined || night === undefined) {
      return null;
    }
    rates = { peakRate: threeTierPeak, shoulderRate: shoulder, offPeakRate: night };
  }

  const freePowerValue =
    section.freePowerRow === null
      ? undefined
      : parseNumber(rows[section.freePowerRow]?.[column]) || undefined;

  const variant = {
    dailyCharge: round(daily * GST_FACTOR, 4),
    ...Object.fromEntries(
      Object.entries(rates).map(([key, value]) => [key, round(value, 5)]),
    ),
    levy: round(levy * GST_FACTOR, 6),
    contractTerm:
      cleanContractTerm(rows[section.contractRow]?.[column]) ?? fallbackContractTerm,
    discount: cleanDiscountDescription(rows[section.discountDescriptionRow]?.[column]),
    cashDiscount:
      parseNumber(rows[section.cashDiscountRow]?.[column]) || undefined,
    percentDiscount: normalizePercent(
      parseNumber(rows[section.percentDiscountRow]?.[column]),
    ),
    freePowerValue: freePowerValue
      ? round(freePowerValue, 2)
      : undefined,
    freePowerBenchmarkKwh: freePowerValue ? section.benchmarkKwh : undefined,
    sourceAnnualEstimate:
      parseNumber(rows[section.annualRow]?.[column]) ?? undefined,
    sourceAnnualAfterDiscounts:
      parseNumber(rows[section.annualAfterDiscountsRow]?.[column]) ?? undefined,
  };

  return {
    variant,
    summaryDailyCharge:
      parseNumber(rows[section.summaryDailyRow]?.[column]) ?? undefined,
  };
}

function expectedAnnual(pricing, variant, annualKwh, shares) {
  let energyRate;
  if (pricing === 'inclusive') {
    energyRate = variant.inclusiveRate;
  } else if (pricing === 'peak-offpeak') {
    energyRate = shares.peak * variant.peakRate + shares.offPeak * variant.offPeakRate;
  } else {
    energyRate =
      shares.peak * variant.peakRate +
      shares.shoulder * variant.shoulderRate +
      shares.offPeak * variant.offPeakRate;
  }

  return annualKwh * (energyRate + (variant.levy ?? 0)) + variant.dailyCharge * 365;
}

const rawCsv = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const rows = parseCsv(rawCsv);
const plans = [];
const validation = [];

for (const definition of PLAN_DEFS) {
  const standard = definition.standard
    ? readVariant(
        rows,
        SECTIONS.standard,
        definition.standard,
        definition.pricing,
        definition.contractTerm,
      )
    : null;
  const low = definition.low
    ? readVariant(
        rows,
        SECTIONS.low,
        definition.low,
        definition.pricing,
        definition.contractTerm,
      )
    : null;

  if (!standard && !low) {
    throw new Error(`No usable rates found for ${definition.name}`);
  }

  for (const [userType, result] of Object.entries({ standard, low })) {
    if (!result) continue;
    if (
      result.summaryDailyCharge !== undefined &&
      Math.abs(result.variant.dailyCharge - result.summaryDailyCharge) > 0.01
    ) {
      throw new Error(
        `${definition.id} (${userType}) daily charge mismatch: got $${result.variant.dailyCharge}, expected $${result.summaryDailyCharge}`,
      );
    }
  }

  const variants = {};
  if (standard) variants.standard = standard.variant;
  if (low) {
    variants.low = {
      ...low.variant,
      ...(definition.lowName && definition.lowName !== definition.name
        ? { name: definition.lowName }
        : {}),
    };
  }

  if (variants.standard && variants.low) {
    if (!variants.low.contractTerm && variants.standard.contractTerm) {
      variants.low.contractTerm = variants.standard.contractTerm;
    }
    if (!variants.standard.contractTerm && variants.low.contractTerm) {
      variants.standard.contractTerm = variants.low.contractTerm;
    }
  }

  const plan = {
    id: definition.id,
    provider: definition.provider,
    name: definition.name,
    category: definition.category,
    pricing: definition.pricing,
    variants,
  };

  const sharesFor = (pricing) =>
    pricing === 'peak-shoulder-offpeak' ? THREE_TIER_SHARES : TWO_TIER_SHARES;

  const annualValidationIsMeaningful = (userType) =>
    !(definition.category === 'ev' && definition.pricing === 'peak-offpeak') &&
    !(definition.id.startsWith('octopus-energy-') && userType === 'low');

  for (const [userType, variant] of Object.entries(variants)) {
    if (!variant.sourceAnnualEstimate || !annualValidationIsMeaningful(userType)) {
      continue;
    }

    const benchmarkKwh =
      userType === 'standard' ? STANDARD_BENCHMARK_KWH : LOW_BENCHMARK_KWH;
    const shares = sharesFor(definition.pricing);
    const beforeDiscounts = expectedAnnual(
      definition.pricing,
      variant,
      benchmarkKwh,
      shares,
    );
    const percentageDiscount =
      (beforeDiscounts * (variant.percentDiscount ?? 0)) / 100;
    const afterDiscounts =
      beforeDiscounts -
      (variant.cashDiscount ?? 0) -
      percentageDiscount -
      (variant.freePowerValue ?? 0);

    validation.push({
      id: definition.id,
      userType,
      beforeDiscounts,
      afterDiscounts,
      expectedBefore: variant.sourceAnnualEstimate,
      expectedAfter: variant.sourceAnnualAfterDiscounts,
    });
  }

  plans.push(plan);
}

plans.sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));

const ids = new Set();
for (const plan of plans) {
  if (ids.has(plan.id)) throw new Error(`Duplicate plan id: ${plan.id}`);
  ids.add(plan.id);
}

const failures = validation.flatMap((entry) => {
  const problems = [];
  if (Math.abs(entry.beforeDiscounts - entry.expectedBefore) > 1) {
    problems.push(
      `${entry.id} (${entry.userType}) before discounts: got $${entry.beforeDiscounts.toFixed(2)}, expected $${entry.expectedBefore.toFixed(2)}`,
    );
  }
  if (
    entry.expectedAfter !== undefined &&
    Math.abs(entry.afterDiscounts - entry.expectedAfter) > 1
  ) {
    problems.push(
      `${entry.id} (${entry.userType}) after discounts: got $${entry.afterDiscounts.toFixed(2)}, expected $${entry.expectedAfter.toFixed(2)}`,
    );
  }
  return problems;
});

if (failures.length > 0) {
  console.error('Validation failures:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exitCode = 1;
}

const maxDelta = validation.reduce(
  (max, entry) =>
    Math.max(
      max,
      Math.abs(entry.beforeDiscounts - entry.expectedBefore),
      entry.expectedAfter === undefined
        ? 0
        : Math.abs(entry.afterDiscounts - entry.expectedAfter),
    ),
  0,
);

function existingGeneratedAt() {
  try {
    const existing = fs.readFileSync(outputPath, 'utf8');
    return existing.match(/"generatedAt":\s*"([^"]+)"/)?.[1];
  } catch {
    return undefined;
  }
}

const meta = {
  region: 'Wellington',
  source: 'MoneyHub Power Comparison',
  sourceDate: 'October 2026',
  ratesIncludeGst: true,
  gstRate: 0.15,
  generatedAt: existingGeneratedAt() ?? new Date().toISOString(),
};

const file = `// This file is generated by scripts/build-plans.mjs. Do not edit by hand.
// Source: ${meta.source}, ${meta.sourceDate} (${meta.region}).
// All rates and daily charges are GST-inclusive (15%).
import type { ElectricityPlan, PlanDataMeta } from '../types';

export const PLAN_DATA_META: PlanDataMeta = ${JSON.stringify(meta, null, 2)};

export const WELLINGTON_PLANS: ElectricityPlan[] = ${JSON.stringify(plans, null, 2)};
`;

fs.writeFileSync(outputPath, file);

console.log(`Wrote ${plans.length} plans to ${path.relative(root, outputPath)}`);
console.log(
  `Validated ${validation.length} plan/user-type combinations; max delta $${maxDelta.toFixed(2)}`,
);
if (failures.length > 0) {
  console.error(`${failures.length} validation failure(s) — see above.`);
} else {
  console.log('All generated estimates match MoneyHub annual totals within $1.');
}
