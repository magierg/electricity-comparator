import { formatKwh } from '../lib/format';
import type { UserType } from '../types';

interface UserTypeToggleProps {
  value: UserType;
  suggested: UserType;
  annualKwh: number;
  onChange: (userType: UserType) => void;
  onUseSuggested: () => void;
}

export default function UserTypeToggle({
  value,
  suggested,
  annualKwh,
  onChange,
  onUseSuggested,
}: UserTypeToggleProps) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        User type
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(['low', 'standard'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              value === option
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {option === 'low' ? 'Low user' : 'Standard user'}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>
          Suggested: <span className="font-medium text-slate-700">{suggested === 'low' ? 'Low user' : 'Standard user'}</span>
          {' '}at {formatKwh(annualKwh)}/year.
        </span>
        {value !== suggested ? (
          <button
            type="button"
            onClick={onUseSuggested}
            className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
          >
            Use suggestion
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">
        Low user: under 8,000 kWh/year. Lower daily charge, higher per-kWh rate.
      </p>
    </fieldset>
  );
}
