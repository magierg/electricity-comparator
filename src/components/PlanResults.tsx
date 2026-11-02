import { getProviderLabel } from '../lib/plans';
import type { PlanCategory, PlanCostResult } from '../types';
import Card from './Card';
import PlanRow from './PlanRow';
import SectionHeader from './SectionHeader';

interface PlanResultsProps {
  results: PlanCostResult[];
  currentPlanOptions: PlanCostResult[];
  providers: string[];
  provider: string;
  category: PlanCategory | 'all';
  currentPlanId: string;
  onProviderChange: (provider: string) => void;
  onCategoryChange: (category: PlanCategory | 'all') => void;
  onSelectCurrent: (planId: string) => void;
}

export default function PlanResults({
  results,
  currentPlanOptions,
  providers,
  provider,
  category,
  currentPlanId,
  onProviderChange,
  onCategoryChange,
  onSelectCurrent,
}: PlanResultsProps) {
  const hasFilters = provider !== 'all' || category !== 'all';

  return (
    <Card ariaLabel="Plan comparison results">
      <div className="border-b border-slate-200 px-5 py-4">
        <SectionHeader
          title="Plans ranked by annual cost"
          description="Estimates use your usage shape, the selected user type, and the selected peak windows."
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          }
        />
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider
            </span>
            <select
              value={provider}
              onChange={(event) => onProviderChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All providers</option>
              {providers.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Plan type
            </span>
            <select
              value={category}
              onChange={(event) =>
                onCategoryChange(event.target.value as PlanCategory | 'all')
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All plan types</option>
              <option value="standard">Standard</option>
              <option value="ev">EV</option>
              <option value="bundle">Bundle</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your current plan
            </span>
            <select
              value={currentPlanId}
              onChange={(event) => onSelectCurrent(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Not selected</option>
              {currentPlanOptions.map((result) => (
                <option key={result.plan.id} value={result.plan.id}>
                  {getProviderLabel(result.planName, result.plan.provider)
                    ? `${result.plan.provider} — ${result.planName}`
                    : result.planName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {results.length} plan{results.length === 1 ? '' : 's'} shown
            {hasFilters ? ' after filters' : ''}.
          </span>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                onProviderChange('all');
                onCategoryChange('all');
              }}
              className="font-semibold text-blue-700 hover:text-blue-800"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No plans match those filters. Try clearing them.
          </div>
        ) : (
          <div className="space-y-2.5">
            {results.map((result, index) => (
              <PlanRow
                key={result.plan.id}
                result={result}
                rank={index + 1}
                isBest={index === 0}
                isCurrent={result.plan.id === currentPlanId}
                onSelectCurrent={(planId) =>
                  onSelectCurrent(currentPlanId === planId ? '' : planId)
                }
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
