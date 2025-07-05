import { useState, useEffect, useRef } from 'react'
import './App.css'
import UsageInput from './components/UsageInput'
import PlanComparison from './components/PlanComparison'
import DataUpload from './components/DataUpload'
import type { UsagePattern, ElectricityPlan } from './types'

function App() {
  const [usagePattern, setUsagePattern] = useState<UsagePattern>({
    hourlyUsage: new Array(24).fill(0),
    totalDaily: 0
  })

  const [plans, setPlans] = useState<ElectricityPlan[]>([
    {
      id: 'constant',
      name: 'Constant Rate',
      type: 'constant',
      rate: 0.25, // $0.25 per kWh
      peakHours: [],
      offPeakRate: 0,
      dailyCharge: 1.50, // $1.50 daily charge
      includeGST: true
    },
    {
      id: 'time-of-use',
      name: 'Time of Use',
      type: 'time-of-use',
      rate: 0.35, // Peak rate $0.35 per kWh
      peakHours: [17, 18, 19, 20, 21], // 5 PM to 9 PM
      offPeakRate: 0.18, // Off-peak rate $0.18 per kWh
      dailyCharge: 1.20, // $1.20 daily charge
      includeGST: true
    }
  ])

  const [suggestedUserType, setSuggestedUserType] = useState<'low' | 'standard' | null>(null);
  const planComparisonRef = useRef<any>(null);

  // Predict yearly usage from current pattern
  const predictedYearlyUsage = usagePattern.totalDaily * 365;

  // Suggest user type for Wellington (North Island): low user < 8000 kWh/year
  useEffect(() => {
    if (predictedYearlyUsage < 8000) {
      setSuggestedUserType('low');
    } else {
      setSuggestedUserType('standard');
    }
  }, [predictedYearlyUsage]);

  const handlePeakHoursChange = (peakHours: number[]) => {
    setPlans(prevPlans => 
      prevPlans.map(plan => 
        plan.type === 'time-of-use' 
          ? { ...plan, peakHours }
          : plan
      )
    );
  };

  // Handler to set user type in PlanComparison
  const handleSetUserType = (type: 'low' | 'standard') => {
    if (planComparisonRef.current && planComparisonRef.current.setUserType) {
      planComparisonRef.current.setUserType(type);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-pink-200 focus:outline-none" tabIndex={0}>
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12 flex flex-col items-center" role="banner">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-400 rounded-full mb-4 shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-300" tabIndex={0} aria-label="App logo">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300" tabIndex={0}>Electricity Plan Comparator</h1>
          <p className="text-xl text-gray-800 max-w-2xl mx-auto leading-relaxed" id="app-desc">
            Compare constant rate vs time-of-use electricity plans based on your daily usage pattern and find the best deal for your home
          </p>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8" aria-label="Main content">
          <section className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200 p-8 hover:shadow-2xl transition-all duration-300 mb-8" aria-label="Upload Usage Data">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" tabIndex={0} aria-label="Upload icon">
                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-pink-900" tabIndex={0}>Upload Usage Data</h2>
            </div>
            <DataUpload 
              onUsageChange={setUsagePattern}
              onPeakHoursChange={handlePeakHoursChange}
            />
          </section>

          <section className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200 p-8 hover:shadow-2xl transition-all duration-300" aria-label="Daily Usage Pattern">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300" tabIndex={0} aria-label="Usage icon">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-purple-900" tabIndex={0}>Daily Usage Pattern</h2>
            </div>
            <UsageInput 
              usagePattern={usagePattern}
              onUsageChange={setUsagePattern}
              onPeakHoursChange={handlePeakHoursChange}
            />
          </section>

          <section className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200 p-8 hover:shadow-2xl transition-all duration-300" aria-label="Plan Comparison">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mr-3 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300" tabIndex={0} aria-label="Plan icon">
                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-pink-900" tabIndex={0}>Plan Comparison</h2>
            </div>
            {/* Yearly usage prediction and suggestion */}
            <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col gap-2" aria-live="polite" tabIndex={0}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-purple-900 text-lg">Predicted yearly usage:</span>
                <span className="text-2xl font-extrabold text-pink-700" id="yearly-usage">{predictedYearlyUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</span>
              </div>
              {suggestedUserType && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-purple-900">Suggested user type:</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${suggestedUserType === 'low' ? 'bg-pink-200 text-pink-900' : 'bg-indigo-100 text-indigo-900'}`}>{suggestedUserType === 'low' ? 'Low User' : 'Standard User'}</span>
                  <button
                    className="ml-2 px-3 py-1 rounded-lg bg-pink-600 text-white font-medium hover:bg-pink-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 transition-colors"
                    onClick={() => handleSetUserType(suggestedUserType)}
                    aria-describedby="user-type-desc"
                  >
                    Use this
                  </button>
                  <span id="user-type-desc" className="sr-only">Set user type to {suggestedUserType === 'low' ? 'Low User' : 'Standard User'} for plan comparison</span>
                </div>
              )}
              <div className="text-xs text-purple-700 mt-1">
                {suggestedUserType === 'low'
                  ? 'Low User: Less than 8000 kWh/year (North Island, Wellington). Lower daily charge, higher per-unit rate.'
                  : 'Standard User: More than 8000 kWh/year. Higher daily charge, lower per-unit rate.'}
              </div>
            </div>
            <PlanComparison 
              ref={planComparisonRef}
              usagePattern={usagePattern}
              plans={plans}
              onPlansChange={setPlans}
            />
          </section>
        </section>
      </div>
    </main>
  )
}

export default App
