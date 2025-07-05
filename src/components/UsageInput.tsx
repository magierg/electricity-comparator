import { useState } from 'react';
import type { UsagePattern } from '../types';
import DataUpload from './DataUpload';

interface UsageInputProps {
  usagePattern: UsagePattern;
  onUsageChange: (pattern: UsagePattern) => void;
  onPeakHoursChange?: (peakHours: number[]) => void;
}

const UsageInput: React.FC<UsageInputProps> = ({ usagePattern, onUsageChange, onPeakHoursChange }) => {
  const [inputMode, setInputMode] = useState<'individual' | 'pattern' | 'upload'>('pattern');

  const handleHourlyChange = (hour: number, value: number) => {
    const newHourlyUsage = [...usagePattern.hourlyUsage];
    newHourlyUsage[hour] = value;
    const totalDaily = newHourlyUsage.reduce((sum, usage) => sum + usage, 0);
    
    onUsageChange({
      hourlyUsage: newHourlyUsage,
      totalDaily
    });
  };

  const generateTypicalPattern = (patternType: string) => {
    let pattern: number[] = new Array(24).fill(0);
    
    switch (patternType) {
      case 'residential':
        // Typical residential pattern with morning and evening peaks
        pattern = [
          0.5, 0.4, 0.3, 0.3, 0.4, 0.8, 1.2, 1.0, 0.8, 0.6, 0.5, 0.5,
          0.6, 0.7, 0.8, 0.9, 1.5, 2.0, 2.5, 2.2, 1.8, 1.4, 1.0, 0.7
        ];
        break;
      case 'business':
        // Business hours pattern
        pattern = [
          0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 1.0, 2.0, 2.5, 2.8, 3.0,
          2.5, 2.8, 3.0, 2.8, 2.5, 2.0, 1.5, 1.0, 0.5, 0.3, 0.2, 0.2
        ];
        break;
      case 'flat':
        // Flat usage pattern
        pattern = new Array(24).fill(1.0);
        break;
      default:
        pattern = new Array(24).fill(0);
    }
    
    const totalDaily = pattern.reduce((sum, usage) => sum + usage, 0);
    onUsageChange({
      hourlyUsage: pattern,
      totalDaily
    });
  };

  return (
    <div className="space-y-8">
      {/* Mode Switcher */}
      <div className="flex space-x-3">
        <button
          onClick={() => setInputMode('pattern')}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 bg-white/60 border border-pink-200 shadow-md ${
            inputMode === 'pattern' 
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xl scale-105 border-pink-400' 
              : 'text-purple-700 hover:bg-pink-100/60 hover:shadow-lg'
          }`}
        >
          <span className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Use Pattern
          </span>
        </button>
        <button
          onClick={() => setInputMode('individual')}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 bg-white/60 border border-pink-200 shadow-md ${
            inputMode === 'individual' 
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xl scale-105 border-pink-400' 
              : 'text-purple-700 hover:bg-pink-100/60 hover:shadow-lg'
          }`}
        >
          <span className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Custom Hours
          </span>
        </button>
        <button
          onClick={() => setInputMode('upload')}
          className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 bg-white/60 border border-pink-200 shadow-md ${
            inputMode === 'upload' 
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xl scale-105 border-pink-400' 
              : 'text-purple-700 hover:bg-pink-100/60 hover:shadow-lg'
          }`}
        >
          <span className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Data
          </span>
        </button>
      </div>

      {/* Pattern Mode */}
      {inputMode === 'pattern' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Choose Your Usage Pattern</h3>
            <p className="text-purple-700">Select the pattern that best matches your daily electricity usage</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <button
              onClick={() => generateTypicalPattern('residential')}
              className="group p-6 border-2 border-transparent rounded-2xl text-left bg-white/80 shadow-lg hover:border-pink-400 hover:bg-pink-50/80 transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-start">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-400 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 text-lg">🏠 Residential</h4>
                  <p className="text-purple-700 mt-1">Morning and evening peaks - typical for homes with families</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => generateTypicalPattern('business')}
              className="group p-6 border-2 border-transparent rounded-2xl text-left bg-white/80 shadow-lg hover:border-pink-400 hover:bg-pink-50/80 transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-start">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 text-lg">🏢 Business</h4>
                  <p className="text-purple-700 mt-1">Daytime usage pattern - ideal for offices and commercial spaces</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => generateTypicalPattern('flat')}
              className="group p-6 border-2 border-transparent rounded-2xl text-left bg-white/80 shadow-lg hover:border-pink-400 hover:bg-pink-50/80 transition-all duration-200 hover:scale-105"
            >
              <div className="flex items-start">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-300 to-purple-300 rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 text-lg">📊 Flat</h4>
                  <p className="text-purple-700 mt-1">Constant usage throughout the day - minimal variations</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Individual Mode */}
      {inputMode === 'individual' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Custom Hourly Usage</h3>
            <p className="text-purple-700">Enter your electricity usage for each hour of the day (kWh)</p>
          </div>
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="text-center">
                  <label htmlFor={`hour-input-${hour}`} className="block text-xs font-medium text-purple-900 mb-2">
                    {String(hour).padStart(2, '0')}:00
                  </label>
                  <input
                    id={`hour-input-${hour}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={usagePattern.hourlyUsage[hour]}
                    onChange={(e) => handleHourlyChange(hour, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 border border-pink-200 rounded-lg text-center text-xs focus:ring-2 focus:ring-pink-300 focus:border-transparent hover:border-pink-400 transition-colors bg-white shadow-sm text-purple-900"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <DataUpload onUsageChange={onUsageChange} onPeakHoursChange={onPeakHoursChange} />
      )}

      {/* Usage Summary */}
      <div className="bg-gradient-to-r from-pink-100/70 to-purple-100/70 border border-pink-200 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mr-3 shadow-md">
            <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-purple-900">Usage Summary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/80 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-purple-700 mb-1">Total Daily Usage</p>
            <p className="text-2xl font-bold text-pink-600">{usagePattern.totalDaily.toFixed(2)} kWh</p>
          </div>
          <div className="bg-white/80 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-purple-700 mb-1">Average per Hour</p>
            <p className="text-2xl font-bold text-pink-600">{(usagePattern.totalDaily / 24).toFixed(2)} kWh</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageInput;
