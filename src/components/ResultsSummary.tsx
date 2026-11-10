import { formatCurrency, formatKwh } from '../lib/format';
import { getProviderLabel } from '../lib/plans';
import type { PlanCostResult, UserType } from '../types';
import Badge from './Badge';
import Card from './Card';
import UserTypeToggle from './UserTypeToggle';

interface ResultsSummaryProps {
  best?: PlanCostResult;
  current?: PlanCostResult;
  annualKwh: number;
  userType: UserType;
  suggestedUserType: UserType;
  planCount: number;
  onUserTypeChange: (userType: UserType) => void;
  onUseSuggested: () => void;
}

export default function ResultsSummary({
  best,
  current,
  annualKwh,
  userType,
  suggestedUserType,
  planCount,
  onUserTypeChange,
  onUseSuggested,
}: ResultsSummaryProps) {
  const savings = current && best ? current.breakdown.totalYearly - best.breakdown.totalYearly : null;
  const firstYearDifference =
    best && Math.abs(best.firstYearEstimate - best.breakdown.totalYearly) > 0.5
      ? best.firstYearEstimate
      : null;

  return (
    <Card ariaLabel="Comparison summary">
      <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cheapest plan for your usage
            </p>
            <Badge tone="amber">Best value</Badge>
            {best?.plan.category === 'ev' ? <Badge tone="slate">EV plan</Badge> : null}
            {best?.plan.category === 'bundle' ? (
              <Badge tone="violet">Bundle</Badge>
            ) : null}
          </div>

          {best ? (
            <>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {best.planName}
                </p>
                {getProviderLabel(best.planName, best.plan.provider) ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {getProviderLabel(best.planName, best.plan.provider)}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                <div>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-blue-700 dark:text-blue-300">
                    {formatCurrency(best.breakdown.totalYearly)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">per year, ongoing</p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="tabular-nums">{formatCurrency(best.breakdown.totalMonthly)} / month</p>
                  <p className="tabular-nums">{formatCurrency(best.breakdown.totalDaily)} / day</p>
                </div>
                {firstYearDifference !== null ? (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
                    <span className="font-semibold">{formatCurrency(firstYearDifference)}</span> first year
                    after credits/discounts
                  </div>
                ) : null}
              </div>

              <div className="mt-5">
                {current ? (
                  savings !== null && savings > 0.5 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30">
                      <span className="text-sm font-semibold">
                        You could save {formatCurrency(savings)} per year
                      </span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        switching from {current.planName} ({formatCurrency(current.breakdown.totalYearly)}/year)
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                      Your current plan is already the cheapest available for this usage.
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Choose your current plan below to see your estimated savings.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              Add some usage to see the best plan.
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <UserTypeToggle
            value={userType}
            suggested={suggestedUserType}
            annualKwh={annualKwh}
            onChange={onUserTypeChange}
            onUseSuggested={onUseSuggested}
          />
          <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <p>
              <span className="font-medium text-slate-700 dark:text-slate-300">{planCount}</span> plans available
              for {userType === 'low' ? 'low' : 'standard'} users.
            </p>
            <p>Based on {formatKwh(annualKwh)} per year.</p>
            <p>All prices include 15% GST.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
