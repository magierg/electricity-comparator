import { useMemo, useState } from 'react';
import Badge from './components/Badge';
import Card from './components/Card';
import PeakScheduleSettings from './components/PeakScheduleSettings';
import PlanResults from './components/PlanResults';
import ResultsSummary from './components/ResultsSummary';
import ThemeToggle from './components/ThemeToggle';
import UsageChart from './components/UsageChart';
import UsagePanel from './components/UsagePanel';
import { DEFAULT_PEAK_SCHEDULE } from './constants';
import { PLAN_DATA_META, WELLINGTON_PLANS } from './data/wellington-plans';
import { calculateAllPlanCosts, suggestUserType } from './lib/calculator';
import { annualUsageFromPattern, createDefaultUsage } from './lib/usage';
import { getProviderOptions } from './lib/plans';
import { useTheme } from './lib/useTheme';
import type { PeakSchedule, PlanCategory, UsagePattern, UsageSource, UserType } from './types';

function App() {
  const { theme, selectTheme } = useTheme();
  const [usage, setUsage] = useState<UsagePattern>(() => createDefaultUsage());
  const [usageSource, setUsageSource] = useState<UsageSource>({
    kind: 'estimate',
    label: 'Evening estimate',
  });
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [schedule, setSchedule] = useState<PeakSchedule>(DEFAULT_PEAK_SCHEDULE);
  const [currentPlanId, setCurrentPlanId] = useState('');
  const [provider, setProvider] = useState('all');
  const [category, setCategory] = useState<PlanCategory | 'all'>('all');

  const annualKwh = annualUsageFromPattern(usage);
  const suggestedUserType = suggestUserType(annualKwh);
  const userType = selectedUserType ?? suggestedUserType;
  const providers = useMemo(() => getProviderOptions(WELLINGTON_PLANS), []);

  const allResults = useMemo(
    () => calculateAllPlanCosts(usage, WELLINGTON_PLANS, userType, schedule),
    [usage, userType, schedule],
  );

  const bestResult = allResults[0];
  const currentResult = allResults.find((result) => result.plan.id === currentPlanId);
  const effectiveCurrentPlanId = currentResult ? currentPlanId : '';

  const visibleResults = useMemo(
    () =>
      allResults.filter((result) => {
        if (provider !== 'all' && result.plan.provider !== provider) return false;
        if (category !== 'all' && result.plan.category !== category) return false;
        return true;
      }),
    [allResults, provider, category],
  );

  const handleUsageChange = (nextUsage: UsagePattern, nextSource: UsageSource) => {
    setUsage(nextUsage);
    setUsageSource(nextSource);
  };

  const clearCurrentPlanIfUnavailable = (nextUserType: UserType) => {
    if (!currentPlanId) return;
    const currentPlan = WELLINGTON_PLANS.find((plan) => plan.id === currentPlanId);
    if (!currentPlan?.variants[nextUserType]) {
      setCurrentPlanId('');
    }
  };

  const handleUserTypeChange = (nextUserType: UserType) => {
    setSelectedUserType(nextUserType);
    clearCurrentPlanIfUnavailable(nextUserType);
  };

  const handleUseSuggested = () => {
    setSelectedUserType(null);
    clearCurrentPlanIfUnavailable(suggestedUserType);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                Wellington Electricity Plan Comparison
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Compare real Wellington plans against your half-hour usage and see what
                switching could save.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ThemeToggle theme={theme} onThemeChange={selectTheme} />
            <Badge tone="blue">Wellington</Badge>
            <Badge tone="slate">{WELLINGTON_PLANS.length} plans</Badge>
            <Badge tone="emerald">GST included</Badge>
            <Badge tone="amber">
              {PLAN_DATA_META.source} · {PLAN_DATA_META.sourceDate}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6 min-w-0">
            <UsagePanel
              usage={usage}
              source={usageSource}
              onUsageChange={handleUsageChange}
            />

            <Card ariaLabel="Daily usage chart">
              <div className="p-5">
                <UsageChart usage={usage} schedule={schedule} theme={theme} />
              </div>
            </Card>

            <PeakScheduleSettings schedule={schedule} onChange={setSchedule} />
          </div>

          <div className="space-y-6 min-w-0">
            <ResultsSummary
              best={bestResult}
              current={currentResult}
              annualKwh={annualKwh}
              userType={userType}
              suggestedUserType={suggestedUserType}
              planCount={allResults.length}
              onUserTypeChange={handleUserTypeChange}
              onUseSuggested={handleUseSuggested}
            />

            <PlanResults
              results={visibleResults}
              currentPlanOptions={allResults}
              providers={providers}
              provider={provider}
              category={category}
              currentPlanId={effectiveCurrentPlanId}
              onProviderChange={setProvider}
              onCategoryChange={setCategory}
              onSelectCurrent={(planId) =>
                setCurrentPlanId((current) => (current === planId ? '' : planId))
              }
            />
          </div>
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            Plan rates and charges are from {PLAN_DATA_META.source}, {PLAN_DATA_META.sourceDate},
            for {PLAN_DATA_META.region}. All prices include 15% GST. Peak windows are an
            adjustable assumption, not published retailer data. EV and bundle plans may
            have eligibility or bundling conditions. Estimates are a guide; confirm
            current pricing and terms with the provider before switching.
          </p>
          <p className="mt-1">
            Generated {new Date(PLAN_DATA_META.generatedAt).toLocaleDateString('en-NZ')}.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
