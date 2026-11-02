import { useState } from 'react';
import {
  formatCurrency,
  formatKwh,
  formatRate,
} from '../lib/format';
import { getPricingLabel, getProviderLabel, getRateSummary } from '../lib/plans';
import type { PlanCostResult } from '../types';
import Badge from './Badge';

interface PlanRowProps {
  result: PlanCostResult;
  rank: number;
  isBest: boolean;
  isCurrent: boolean;
  onSelectCurrent: (planId: string) => void;
}

function UsageLine({
  label,
  usage,
  cost,
  rate,
}: {
  label: string;
  usage: number;
  cost: number;
  rate?: number;
}) {
  if (usage <= 0) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-slate-600">
        {label} <span className="text-slate-400">({formatKwh(usage)})</span>
        {rate !== undefined ? (
          <span className="ml-1 text-xs text-slate-400">at {formatRate(rate)}</span>
        ) : null}
      </span>
      <span className="font-medium tabular-nums text-slate-900">{formatCurrency(cost)}</span>
    </div>
  );
}

export default function PlanRow({
  result,
  rank,
  isBest,
  isCurrent,
  onSelectCurrent,
}: PlanRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { plan, variant, breakdown } = result;
  const isInclusive = plan.pricing === 'inclusive';
  const isThreeTier = plan.pricing === 'peak-shoulder-offpeak';
  const firstYearDifference =
    Math.abs(result.firstYearEstimate - breakdown.totalYearly) > 0.5
      ? result.firstYearEstimate
      : null;
  const percentageDiscount =
    (breakdown.totalYearly * (variant.percentDiscount ?? 0)) / 100;

  return (
    <div
      className={`rounded-xl border transition ${
        isBest
          ? 'border-blue-300 bg-blue-50/40 ring-1 ring-inset ring-blue-200'
          : isCurrent
            ? 'border-emerald-300 bg-emerald-50/30'
            : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
              isBest ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
            aria-hidden="true"
          >
            {rank}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{result.planName}</h3>
              {isBest ? <Badge tone="blue">Best value</Badge> : null}
              {plan.category === 'ev' ? <Badge tone="amber">EV</Badge> : null}
              {plan.category === 'bundle' ? <Badge tone="violet">Bundle</Badge> : null}
              {isCurrent ? <Badge tone="emerald">Your plan</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {getProviderLabel(result.planName, plan.provider)
                ? `${getProviderLabel(result.planName, plan.provider)} · `
                : ''}
              {getPricingLabel(plan.pricing)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{getRateSummary(plan, variant)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums text-slate-900">
              {formatCurrency(breakdown.totalYearly)}
              <span className="text-xs font-normal text-slate-500">/year</span>
            </p>
            <p className="text-xs tabular-nums text-slate-500">
              {formatCurrency(breakdown.totalMonthly)}/month
              {firstYearDifference !== null ? (
                <span className="ml-2 text-amber-700">
                  {formatCurrency(firstYearDifference)} first year
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectCurrent(plan.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                isCurrent
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={isCurrent}
            >
              {isCurrent ? 'Current plan' : 'This is my plan'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50"
              aria-expanded={expanded}
              aria-label={expanded ? `Hide ${result.planName} details` : `Show ${result.planName} details`}
            >
              <svg
                className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cost breakdown
              </h4>
              <div className="mt-2 divide-y divide-slate-100 text-sm">
                {isInclusive ? (
                  <UsageLine
                    label="Usage"
                    usage={breakdown.inclusiveUsage}
                    cost={breakdown.inclusiveCost}
                    rate={variant.inclusiveRate}
                  />
                ) : (
                  <>
                    <UsageLine
                      label="Peak"
                      usage={breakdown.peakUsage}
                      cost={breakdown.peakCost}
                      rate={variant.peakRate}
                    />
                    {isThreeTier ? (
                      <UsageLine
                        label="Shoulder"
                        usage={breakdown.shoulderUsage}
                        cost={breakdown.shoulderCost}
                        rate={variant.shoulderRate}
                      />
                    ) : null}
                    <UsageLine
                      label="Off-peak"
                      usage={breakdown.offPeakUsage}
                      cost={breakdown.offPeakCost}
                      rate={variant.offPeakRate}
                    />
                  </>
                )}
                {breakdown.levyCost > 0 ? (
                  <div className="flex items-baseline justify-between gap-4 py-1.5">
                    <span className="text-slate-600">Electricity Authority levy</span>
                    <span className="font-medium tabular-nums text-slate-900">
                      {formatCurrency(breakdown.levyCost)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="text-slate-600">Daily charge</span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {formatCurrency(breakdown.dailyCharge)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2 text-sm font-semibold text-slate-900">
                  <span>Total per day</span>
                  <span className="tabular-nums">{formatCurrency(breakdown.totalDaily)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Effective usage rate: {formatRate(breakdown.effectiveRate)}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Plan details
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Daily charge</dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatCurrency(variant.dailyCharge)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Annual estimate</dt>
                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatCurrency(breakdown.totalYearly)}
                  </dd>
                </div>
                {variant.cashDiscount ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Sign-up credit</dt>
                    <dd className="font-medium tabular-nums text-emerald-700">
                      −{formatCurrency(variant.cashDiscount)}
                    </dd>
                  </div>
                ) : null}
                {variant.percentDiscount ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">
                      {variant.percentDiscount}% discount
                    </dt>
                    <dd className="font-medium tabular-nums text-emerald-700">
                      −{formatCurrency(percentageDiscount)}
                    </dd>
                  </div>
                ) : null}
                {result.freePowerDiscount > 0.5 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Free power value (est.)</dt>
                    <dd className="font-medium tabular-nums text-emerald-700">
                      −{formatCurrency(result.freePowerDiscount)}
                    </dd>
                  </div>
                ) : null}
                {firstYearDifference !== null ? (
                  <div className="flex justify-between gap-4 border-t border-slate-100 pt-2">
                    <dt className="font-medium text-slate-700">First year after discounts</dt>
                    <dd className="font-semibold tabular-nums text-amber-700">
                      {formatCurrency(firstYearDifference)}
                    </dd>
                  </div>
                ) : null}
                {variant.contractTerm ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Contract</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {variant.contractTerm}
                    </dd>
                  </div>
                ) : null}
                {variant.discount ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600 ring-1 ring-inset ring-slate-200">
                    <span className="font-semibold text-slate-700">Discount: </span>
                    {variant.discount}
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
