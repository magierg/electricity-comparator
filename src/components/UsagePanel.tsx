import { useState } from 'react';
import { formatHour, formatKwh } from '../lib/format';
import {
  annualUsageFromPattern,
  createCustomUsage,
  createUsageFromAnnual,
  USAGE_SHAPES,
  type UsageShape,
} from '../lib/usage';
import type { UsagePattern, UsageSource } from '../types';
import Card from './Card';
import DataUpload from './DataUpload';
import SectionHeader from './SectionHeader';

type InputMode = 'estimate' | 'custom' | 'upload';

interface UsagePanelProps {
  usage: UsagePattern;
  source: UsageSource;
  onUsageChange: (usage: UsagePattern, source: UsageSource) => void;
}

const MODES: Array<{ value: InputMode; label: string; shortLabel: string }> = [
  { value: 'estimate', label: 'Annual estimate', shortLabel: 'Estimate' },
  { value: 'custom', label: 'Custom hours', shortLabel: 'Custom' },
  { value: 'upload', label: 'Upload meter data', shortLabel: 'Upload' },
];

export default function UsagePanel({ usage, source, onUsageChange }: UsagePanelProps) {
  const [mode, setMode] = useState<InputMode>('upload');
  const [annualKwh, setAnnualKwh] = useState(() =>
    Math.round(annualUsageFromPattern(usage)),
  );
  const [shape, setShape] = useState<UsageShape>('evening');
  const [customHours, setCustomHours] = useState<number[]>(usage.hourlyUsage);
  const [sampleLoaded, setSampleLoaded] = useState(false);

  const emitEstimate = (nextAnnualKwh: number, nextShape: UsageShape) => {
    const nextUsage = createUsageFromAnnual(nextAnnualKwh, nextShape);
    const shapeLabel =
      USAGE_SHAPES.find((option) => option.value === nextShape)?.label ?? 'Custom';
    onUsageChange(nextUsage, {
      kind: 'estimate',
      label: `${shapeLabel} estimate`,
    });
  };

  const handleModeChange = (nextMode: InputMode) => {
    setMode(nextMode);
    if (nextMode === 'estimate') {
      const nextAnnual = Math.round(annualUsageFromPattern(usage));
      setAnnualKwh(nextAnnual);
    }
    if (nextMode === 'custom') {
      setCustomHours(usage.hourlyUsage);
    }
  };

  const handleAnnualChange = (value: number) => {
    const next = Math.max(0, value);
    setAnnualKwh(next);
    emitEstimate(next, shape);
  };

  const handleShapeChange = (value: UsageShape) => {
    setShape(value);
    emitEstimate(annualKwh, value);
  };

  const handleHourChange = (hour: number, value: number) => {
    const next = [...customHours];
    next[hour] = Math.max(0, value);
    setCustomHours(next);
    const nextUsage = createCustomUsage(next);
    onUsageChange(nextUsage, { kind: 'custom', label: 'Custom hourly usage' });
  };

  const annual = annualUsageFromPattern(usage);
  const daily = usage.totalDaily;
  const averageHourly = daily / 24;

  return (
    <Card ariaLabel="Your electricity usage">
      <div className="border-b border-slate-200 px-5 py-4">
        <SectionHeader
          title="Your usage"
          description="Use a quick annual estimate or load your half-hour meter data."
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Usage input method">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              onClick={() => handleModeChange(option.value)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                mode === option.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>

        {mode === 'estimate' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Annual usage</span>
              <div className="mt-1.5 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={annualKwh}
                  onChange={(event) => handleAnnualChange(Number(event.target.value))}
                  className="w-full rounded-xl border-0 bg-transparent px-3 py-2.5 text-base font-semibold tabular-nums text-slate-900 focus:outline-none"
                />
                <span className="pr-3 text-sm text-slate-500">kWh/year</span>
              </div>
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Usage shape</legend>
              <div className="mt-2 space-y-2">
                {USAGE_SHAPES.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      shape === option.value
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="usage-shape"
                      value={option.value}
                      checked={shape === option.value}
                      onChange={() => handleShapeChange(option.value)}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {option.label}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="text-xs leading-5 text-slate-500">
              That is about {formatKwh(daily)} per day. The low-user threshold is 8,000
              kWh/year.
            </p>
          </div>
        ) : null}

        {mode === 'custom' ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Enter kWh used in each hour. The total is calculated automatically.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 24 }, (_, hour) => (
                <label key={hour} className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">
                    {formatHour(hour)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={Number(customHours[hour]?.toFixed(2) ?? 0)}
                    onChange={(event) => handleHourChange(hour, Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm tabular-nums text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {mode === 'upload' ? (
          <DataUpload
            onUsageChange={onUsageChange}
            onSampleLoaded={() => setSampleLoaded(true)}
            autoLoadSample={!sampleLoaded}
          />
        ) : null}

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Per day
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
              {formatKwh(daily)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Per year
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
              {formatKwh(annual)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Per hour
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
              {formatKwh(averageHourly)}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-700">{source.label}</span>
          {source.days && source.days > 1 ? ` · ${source.days} days` : ''}.
        </p>
      </div>
    </Card>
  );
}
