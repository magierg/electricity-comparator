import { useEffect, useRef, useState } from 'react';
import { SAMPLE_DATA_URL } from '../constants';
import { formatDate, formatKwh } from '../lib/format';
import { parseMeterCsv, type ParsedUsage } from '../lib/parseMeterCsv';
import type { UsagePattern, UsageSource } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface DataUploadProps {
  onUsageChange: (usage: UsagePattern, source: UsageSource) => void;
  onSampleLoaded?: () => void;
  autoLoadSample?: boolean;
}

export default function DataUpload({
  onUsageChange,
  onSampleLoaded,
  autoLoadSample = false,
}: DataUploadProps) {
  const [parsed, setParsed] = useState<ParsedUsage | null>(null);
  const [selectedDate, setSelectedDate] = useState('average');
  const [sourceKind, setSourceKind] = useState<'upload' | 'sample'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoLoaded = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const applyAverage = (result: ParsedUsage, kind: 'upload' | 'sample') => {
    const label =
      kind === 'sample'
        ? 'Sample meter data'
        : `${result.days.length} day${result.days.length === 1 ? '' : 's'} uploaded`;
    onUsageChange(result.average, {
      kind,
      label,
      days: result.days.length,
      dateRange: result.dateRange,
    });
  };

  const loadSampleData = async () => {
    setIsLoading(true);
    setError('');
    setParsed(null);
    setSelectedDate('average');

    try {
      const response = await fetch(SAMPLE_DATA_URL);
      if (!response.ok) {
        throw new Error('Could not load the sample meter data.');
      }
      const text = await response.text();
      if (!isMounted.current) return;
      const result = parseMeterCsv(text);
      setParsed(result);
      setSourceKind('sample');
      applyAverage(result, 'sample');
      onSampleLoaded?.();
    } catch (caught) {
      if (isMounted.current) {
        setError(caught instanceof Error ? caught.message : 'Could not load the sample data.');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!autoLoadSample || hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    void loadSampleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadSample]);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setError('');
    setParsed(null);
    setSelectedDate('average');

    try {
      const text = await file.text();
      if (!isMounted.current) return;
      const result = parseMeterCsv(text);
      setParsed(result);
      setSourceKind('upload');
      applyAverage(result, 'upload');
    } catch (caught) {
      if (isMounted.current) {
        setError(caught instanceof Error ? caught.message : 'Could not read that file.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDayChange = (value: string) => {
    setSelectedDate(value);

    if (!parsed) return;
    if (value === 'average') {
      applyAverage(parsed, sourceKind);
      return;
    }

    const day = parsed.days.find((candidate) => candidate.isoDate === value);
    if (!day) return;

    onUsageChange(
      { hourlyUsage: day.hourlyUsage, totalDaily: day.totalDaily },
      {
        kind: sourceKind,
        label: formatDate(day.isoDate),
        days: 1,
        dateRange: { start: day.isoDate, end: day.isoDate },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Upload meter CSV</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Half-hour consumption data</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => void loadSampleData()}
          disabled={isLoading}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Use sample data</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">June 2025 Wellington meter</span>
          </span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Upload electricity meter CSV"
      />

      {isLoading ? <LoadingSpinner text="Reading usage data…" /> : null}

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {parsed ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {sourceKind === 'sample' ? 'Sample data loaded' : 'Usage data loaded'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {parsed.days.length} day{parsed.days.length === 1 ? '' : 's'} ·{' '}
                {formatKwh(parsed.average.totalDaily)} average per day
                {parsed.dateRange
                  ? ` · ${formatDate(parsed.dateRange.start)} – ${formatDate(parsed.dateRange.end)}`
                  : ''}
              </p>
            </div>
            {parsed.days.length > 1 ? (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Use</span>
                <select
                  value={selectedDate}
                  onChange={(event) => handleDayChange(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/30"
                >
                  <option value="average">Average of {parsed.days.length} days</option>
                  {parsed.days.map((day) => (
                    <option key={day.isoDate} value={day.isoDate}>
                      {formatDate(day.isoDate)} ({formatKwh(day.totalDaily)})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          {parsed.warnings.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {parsed.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
