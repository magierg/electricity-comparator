import React from 'react';

interface UserTypeSuggestionProps {
  predictedYearlyUsage: number;
  suggestedUserType: 'low' | 'standard' | null;
  onSetUserType: (type: 'low' | 'standard') => void;
}

const UserTypeSuggestion: React.FC<UserTypeSuggestionProps> = ({
  predictedYearlyUsage,
  suggestedUserType,
  onSetUserType,
}) => {
  if (!suggestedUserType) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col gap-2" aria-live="polite" tabIndex={0}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-purple-900 text-lg">Predicted yearly usage:</span>
        <span className="text-2xl font-extrabold text-pink-700" id="yearly-usage">
          {predictedYearlyUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
        </span>
      </div>
      {suggestedUserType && (
        <div className="flex items-center gap-2">
          <span className="font-medium text-purple-900">Suggested user type:</span>
          <span className={`inline-block px-3 py-1 rounded-full text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${suggestedUserType === 'low' ? 'bg-pink-200 text-pink-900' : 'bg-indigo-100 text-indigo-900'}`}>
            {suggestedUserType === 'low' ? 'Low User' : 'Standard User'}
          </span>
          <button
            className="ml-2 px-3 py-1 rounded-lg bg-pink-600 text-white font-medium hover:bg-pink-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 transition-colors"
            onClick={() => onSetUserType(suggestedUserType)}
            aria-describedby="user-type-desc"
          >
            Use this
          </button>
          <span id="user-type-desc" className="sr-only">
            Set user type to {suggestedUserType === 'low' ? 'Low User' : 'Standard User'} for plan comparison
          </span>
        </div>
      )}
      <div className="text-xs text-purple-700 mt-1">
        {suggestedUserType === 'low'
          ? 'Low User: Less than 8000 kWh/year (North Island, Wellington). Lower daily charge, higher per-unit rate.'
          : 'Standard User: More than 8000 kWh/year. Higher daily charge, lower per-unit rate.'}
      </div>
    </div>
  );
};

export default UserTypeSuggestion;
