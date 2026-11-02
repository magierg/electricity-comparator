import { useState } from 'react';
import { HOURS, PEAK_PRESETS } from '../constants';
import { formatHour } from '../lib/format';
import type { PeakSchedule } from '../types';
import Card from './Card';
import SectionHeader from './SectionHeader';

interface PeakScheduleSettingsProps {
  schedule: PeakSchedule;
  onChange: (schedule: PeakSchedule) => void;
}

function sameHours(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((hour, index) => hour === b[index]);
}

function toggleHour(hours: number[], hour: number): number[] {
  return hours.includes(hour)
    ? hours.filter((candidate) => candidate !== hour)
    : [...hours, hour].sort((a, b) => a - b);
}

export default function PeakScheduleSettings({
  schedule,
  onChange,
}: PeakScheduleSettingsProps) {
  const [expanded, setExpanded] = useState(false);

  const activePreset = Object.entries(PEAK_PRESETS).find(
    ([, preset]) =>
      sameHours(preset.schedule.peak, schedule.peak) &&
      sameHours(preset.schedule.shoulder, schedule.shoulder),
  )?.[0];

  const handlePreset = (key: string) => {
    const preset = PEAK_PRESETS[key];
    if (preset) onChange(preset.schedule);
  };

  const handlePeakToggle = (hour: number) => {
    const isPeak = schedule.peak.includes(hour);
    onChange({
      peak: toggleHour(schedule.peak, hour),
      shoulder: isPeak ? schedule.shoulder : schedule.shoulder.filter((h) => h !== hour),
    });
  };

  const handleShoulderToggle = (hour: number) => {
    const isShoulder = schedule.shoulder.includes(hour);
    onChange({
      peak: isShoulder ? schedule.peak : schedule.peak.filter((h) => h !== hour),
      shoulder: toggleHour(schedule.shoulder, hour),
    });
  };

  return (
    <Card ariaLabel="Peak and shoulder hours">
      <div className="px-5 py-4">
        <SectionHeader
          title="Peak windows"
          description="The plan data does not include retailer-specific peak times, so these windows are applied to every plan."
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          action={
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              aria-expanded={expanded}
            >
              {expanded ? 'Hide' : 'Customise'}
            </button>
          }
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(PEAK_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePreset(key)}
              title={preset.description}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activePreset === key
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Peak: {schedule.peak.length > 0 ? schedule.peak.map(formatHour).join(', ') : 'none'}.
          Shoulder: {schedule.shoulder.length > 0 ? schedule.shoulder.map(formatHour).join(', ') : 'none'}.
          Two-tier plans bill shoulder hours at their off-peak rate.
        </p>
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-slate-200 px-5 py-4">
          <fieldset>
            <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
              Peak hours
            </legend>
            <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {HOURS.map((hour) => {
                const selected = schedule.peak.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handlePeakToggle(hour)}
                    className={`rounded-lg px-1.5 py-1.5 text-[11px] font-medium tabular-nums transition ${
                      selected
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-violet-600" aria-hidden="true" />
              Shoulder hours
            </legend>
            <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {HOURS.map((hour) => {
                const selected = schedule.shoulder.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleShoulderToggle(hour)}
                    className={`rounded-lg px-1.5 py-1.5 text-[11px] font-medium tabular-nums transition ${
                      selected
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-violet-100'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p className="text-xs leading-5 text-slate-500">
            An hour cannot be both peak and shoulder. Everything else is off-peak.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
