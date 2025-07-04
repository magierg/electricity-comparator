import { useState, useRef } from 'react';
import type { UsagePattern } from '../types';

interface DataUploadProps {
  onUsageChange: (pattern: UsagePattern) => void;
  onPeakHoursChange?: (peakHours: number[]) => void;
}

interface ParsedData {
  date: string;
  hourlyUsage: number[];
  totalDaily: number;
}

const DataUpload: React.FC<DataUploadProps> = ({ onUsageChange, onPeakHoursChange }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResults, setParseResults] = useState<ParsedData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [customPeakHours, setCustomPeakHours] = useState<number[]>([17, 18, 19, 20, 21]); // Default 5-9 PM
  const [showPeakHoursConfig, setShowPeakHoursConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSVData = (csvText: string): ParsedData[] => {
    const lines = csvText.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);
    
    // Check if this is a meter data CSV
    if (!header.includes('Date') || !header.includes('00:00 - 00:30')) {
      throw new Error('Invalid CSV format. Expected meter usage data with 30-minute intervals.');
    }

    const results: ParsedData[] = [];

    for (const line of dataLines) {
      const values = line.split(',');
      if (values.length < 50) continue; // Should have date + 48 half-hour values
      
      const date = values[3]; // Date column
      const halfHourValues = values.slice(4, 52); // 48 half-hour intervals
      
      // Convert to hourly data by combining every two 30-minute intervals
      const hourlyUsage: number[] = [];
      for (let i = 0; i < 48; i += 2) {
        const val1 = parseFloat(halfHourValues[i]) || 0;
        const val2 = parseFloat(halfHourValues[i + 1]) || 0;
        hourlyUsage.push(val1 + val2);
      }
      
      const totalDaily = hourlyUsage.reduce((sum, usage) => sum + usage, 0);
      
      results.push({
        date,
        hourlyUsage,
        totalDaily
      });
    }
    
    return results;
  };

  const calculateAveragePattern = (data: ParsedData[]): UsagePattern => {
    if (data.length === 0) {
      return { hourlyUsage: new Array(24).fill(0), totalDaily: 0 };
    }
    
    const avgHourlyUsage = new Array(24).fill(0);
    
    // Calculate average for each hour across all days
    for (let hour = 0; hour < 24; hour++) {
      let sum = 0;
      for (const day of data) {
        sum += day.hourlyUsage[hour];
      }
      avgHourlyUsage[hour] = sum / data.length;
    }
    
    const totalDaily = avgHourlyUsage.reduce((sum, usage) => sum + usage, 0);
    
    return {
      hourlyUsage: avgHourlyUsage,
      totalDaily
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');
    setParseResults([]);
    setSelectedDate('');

    try {
      const text = await file.text();
      const parsed = parseCSVData(text);
      setParseResults(parsed);
      
      // Automatically use average pattern if only one day or set first date as selected
      if (parsed.length === 1) {
        setSelectedDate(parsed[0].date);
        onUsageChange({
          hourlyUsage: parsed[0].hourlyUsage,
          totalDaily: parsed[0].totalDaily
        });
      } else if (parsed.length > 1) {
        // Use average pattern by default
        const avgPattern = calculateAveragePattern(parsed);
        onUsageChange(avgPattern);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    const selectedData = parseResults.find(d => d.date === date);
    if (selectedData) {
      onUsageChange({
        hourlyUsage: selectedData.hourlyUsage,
        totalDaily: selectedData.totalDaily
      });
    }
  };

  const useAveragePattern = () => {
    const avgPattern = calculateAveragePattern(parseResults);
    onUsageChange(avgPattern);
    setSelectedDate('average');
  };

  const loadSampleData = async () => {
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await fetch('/data/0000152727TRFFB_meter_usage_data_2025-06-01_to_2025-06-30.csv');
      if (!response.ok) throw new Error('Failed to load sample data');
      
      const text = await response.text();
      const parsed = parseCSVData(text);
      setParseResults(parsed);
      
      // Use average pattern for sample data
      const avgPattern = calculateAveragePattern(parsed);
      onUsageChange(avgPattern);
      setSelectedDate('average');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample data');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePeakHour = (hour: number) => {
    const newPeakHours = customPeakHours.includes(hour)
      ? customPeakHours.filter(h => h !== hour)
      : [...customPeakHours, hour].sort();
    
    setCustomPeakHours(newPeakHours);
    onPeakHoursChange?.(newPeakHours);
  };

  const setPredefinedPeakHours = (preset: string) => {
    let newPeakHours: number[] = [];
    
    switch (preset) {
      case 'morning-evening':
        newPeakHours = [7, 8, 17, 18, 19, 20, 21]; // 7-9 AM, 5-9 PM
        break;
      case 'evening':
        newPeakHours = [17, 18, 19, 20, 21]; // 5-9 PM
        break;
      case 'business':
        newPeakHours = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9 AM - 5 PM
        break;
      case 'custom':
        return; // Don't change anything for custom
      default:
        newPeakHours = [];
    }
    
    setCustomPeakHours(newPeakHours);
    onPeakHoursChange?.(newPeakHours);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Upload Usage Data</h3>
        <p className="text-gray-600 dark:text-gray-300">Upload your electricity meter data CSV file or try our sample data</p>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="group p-6 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl text-center bg-white dark:bg-gray-800 backdrop-blur-md shadow-lg hover:border-blue-400 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 hover:scale-105 disabled:opacity-50"
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Upload CSV File</h4>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Select your meter data file</p>
          </div>
        </button>

        <button
          onClick={loadSampleData}
          disabled={isProcessing}
          className="group p-6 border-2 border-transparent rounded-2xl text-center bg-white dark:bg-gray-800 backdrop-blur-md shadow-lg hover:border-green-400 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900 transition-all duration-200 hover:scale-105 disabled:opacity-50"
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-teal-400 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Try Sample Data</h4>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Load sample meter data</p>
          </div>
        </button>
      </div>

      {/* Peak Hours Configuration */}
      <div className="bg-white dark:bg-gray-800 backdrop-blur-md rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Peak Hours Configuration</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Define when peak electricity rates apply</p>
          </div>
          <button
            onClick={() => setShowPeakHoursConfig(!showPeakHoursConfig)}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className={`w-5 h-5 transition-transform ${showPeakHoursConfig ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>{showPeakHoursConfig ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {showPeakHoursConfig && (
          <div className="space-y-4">
            {/* Preset Peak Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Peak Hours Presets</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setPredefinedPeakHours('morning-evening')}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Morning + Evening
                </button>
                <button
                  onClick={() => setPredefinedPeakHours('evening')}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Evening Only
                </button>
                <button
                  onClick={() => setPredefinedPeakHours('business')}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Business Hours
                </button>
                <button
                  onClick={() => setPredefinedPeakHours('custom')}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Hour Selection Grid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Select Peak Hours (Currently: {customPeakHours.length > 0 ? customPeakHours.map(h => `${h}:00`).join(', ') : 'None'})
              </label>
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 24 }, (_, hour) => (
                  <button
                    key={hour}
                    onClick={() => togglePeakHour(hour)}
                    className={`px-2 py-2 text-xs rounded-lg transition-colors ${
                      customPeakHours.includes(hour)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Click hours to toggle peak status. Red = Peak hours
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-300 mr-3"></div>
          <span className="text-blue-700 dark:text-blue-200">Processing data...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-400 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 dark:text-red-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {parseResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 backdrop-blur-md rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">Parsed Data ({parseResults.length} days)</h4>
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Successfully parsed</span>
            </div>
          </div>

          {parseResults.length > 1 && (
            <div className="mb-4">
              <button
                onClick={useAveragePattern}
                className={`px-4 py-2 rounded-lg font-medium transition-colors mr-2 ${
                  selectedDate === 'average'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Use Average Pattern
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {parseResults.map((data) => (
              <div
                key={data.date}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedDate === data.date
                    ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleDateSelection(data.date)}
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-100">{data.date}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                    {data.totalDaily.toFixed(2)} kWh total
                  </span>
                </div>
                {selectedDate === data.date && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;
