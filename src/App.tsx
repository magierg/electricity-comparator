import { useState, useEffect } from 'react'
import './App.css'
import UsageInput from './components/UsageInput'
import PlanComparison from './components/PlanComparison'
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

  const [theme, setTheme] = useState<'light' | 'dark'>(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Apply theme to html element
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handlePeakHoursChange = (peakHours: number[]) => {
    setPlans(prevPlans => 
      prevPlans.map(plan => 
        plan.type === 'time-of-use' 
          ? { ...plan, peakHours }
          : plan
      )
    );
  };

  return (
    <div className={
      `min-h-screen bg-gradient-to-br ${theme === 'dark' ? 'from-gray-900 via-gray-800 to-gray-900' : 'from-blue-50 via-white to-green-50'}`
    }>
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
            Electricity Plan Comparator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Compare constant rate vs time-of-use electricity plans based on your daily usage pattern and find the best deal for your home
          </p>
          <div className="mt-4 flex gap-2 justify-center">
            <button
              className={`px-4 py-2 rounded-lg font-medium border transition-colors duration-200 ${theme === 'light' ? 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100' : 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700'}`}
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
            >
              Light
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium border transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-700 hover:bg-gray-800' : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
            >
              Dark
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 dark:border-gray-800 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-blue-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Daily Usage Pattern</h2>
            </div>
            <UsageInput 
              usagePattern={usagePattern}
              onUsageChange={setUsagePattern}
              onPeakHoursChange={handlePeakHoursChange}
            />
          </div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 dark:border-gray-800 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Plan Comparison</h2>
            </div>
            <PlanComparison 
              usagePattern={usagePattern}
              plans={plans}
              onPlansChange={setPlans}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
