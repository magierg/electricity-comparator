import { useState, useEffect } from 'react';
import type { UsagePattern, ElectricityPlan, CostCalculation } from '../types';

interface PlanComparisonProps {
  usagePattern: UsagePattern;
  plans: ElectricityPlan[];
  onPlansChange: (plans: ElectricityPlan[]) => void;
}

function PlanComparison({ usagePattern, plans, onPlansChange }: PlanComparisonProps) {
  const [costCalculations, setCostCalculations] = useState<CostCalculation[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const calculateCosts = (usage: UsagePattern, plan: ElectricityPlan): CostCalculation => {
    let peakUsage = 0;
    let offPeakUsage = 0;
    let peakCost = 0;
    let offPeakCost = 0;

    // Calculate usage costs
    if (plan.type === 'constant') {
      const usageCost = usage.totalDaily * plan.rate;
      peakCost = usageCost;
      peakUsage = usage.totalDaily;
    } else {
      usage.hourlyUsage.forEach((hourlyUsage, hour) => {
        if (plan.peakHours.includes(hour)) {
          peakUsage += hourlyUsage;
          peakCost += hourlyUsage * plan.rate;
        } else {
          offPeakUsage += hourlyUsage;
          offPeakCost += hourlyUsage * plan.offPeakRate;
        }
      });
    }

    // Add daily charge
    const totalUsageCost = peakCost + offPeakCost;
    const totalBeforeGST = totalUsageCost + plan.dailyCharge;
    
    // Calculate GST (15% in NZ) if not already included
    const GST_RATE = 0.15;
    const gstAmount = plan.includeGST ? 0 : totalBeforeGST * GST_RATE;
    const dailyCost = totalBeforeGST + gstAmount;

    return {
      planId: plan.id,
      planName: plan.name,
      dailyCost,
      monthlyCost: dailyCost * 30,
      yearlyCost: dailyCost * 365,
      breakdown: {
        peakCost,
        offPeakCost,
        peakUsage,
        offPeakUsage,
        dailyCharge: plan.dailyCharge,
        gstAmount,
        totalBeforeGST
      }
    };
  };

  useEffect(() => {
    const calculations = plans.map(plan => calculateCosts(usagePattern, plan));
    setCostCalculations(calculations);
  }, [usagePattern, plans]);

  const handlePlanUpdate = (planId: string, field: keyof ElectricityPlan, value: any) => {
    const updatedPlans = plans.map(plan => 
      plan.id === planId ? { ...plan, [field]: value } : plan
    );
    onPlansChange(updatedPlans);
  };

  const bestPlan = costCalculations.length > 0 ? costCalculations.reduce((best, current) => 
    current.dailyCost < best.dailyCost ? current : best
  ) : null;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="space-y-8">
      {/* Settings Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Plan Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Customize your electricity plan rates</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-blue-200 dark:border-blue-700 hover:bg-blue-100/60 dark:hover:bg-blue-900/60 rounded-lg transition-colors flex items-center space-x-2 shadow-md"
        >
          <svg className={`w-5 h-5 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>{showSettings ? 'Hide' : 'Show'} Settings</span>
        </button>
      </div>

      {/* Plan Settings */}
      {showSettings && (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-lg">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-4 shadow-md border border-blue-100 dark:border-blue-700">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">{plan.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {plan.type === 'constant' ? 'Rate' : 'Peak Rate'} ($/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={plan.rate}
                    onChange={(e) => handlePlanUpdate(plan.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/90 dark:bg-gray-900/90 shadow-sm text-gray-800 dark:text-gray-100"
                  />
                </div>
                {plan.type === 'time-of-use' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Off-Peak Rate ($/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plan.offPeakRate}
                      onChange={(e) => handlePlanUpdate(plan.id, 'offPeakRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/90 dark:bg-gray-900/90 shadow-sm text-gray-800 dark:text-gray-100"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Daily Charge ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={plan.dailyCharge}
                    onChange={(e) => handlePlanUpdate(plan.id, 'dailyCharge', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white/90 dark:bg-gray-900/90 shadow-sm text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={plan.includeGST}
                      onChange={(e) => handlePlanUpdate(plan.id, 'includeGST', e.target.checked)}
                      className="mr-2 rounded focus:ring-blue-400"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Rates include GST (15%)</span>
                  </label>
                </div>
                {plan.type === 'time-of-use' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Peak Hours
                    </label>
                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50/60 dark:bg-blue-900/60 p-2 rounded shadow-sm">
                      {plan.peakHours.length > 0 ? plan.peakHours.map(hour => `${hour}:00`).join(', ') : 'None set'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cost Comparison */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Cost Comparison</h3>
          {bestPlan && (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Best Plan: {bestPlan.planName}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {costCalculations.map((calc) => (
            <div 
              key={calc.planId}
              className={`relative rounded-2xl p-6 border-2 transition-all duration-300 backdrop-blur-md ${
                calc.planId === bestPlan?.planId 
                  ? 'border-green-400 dark:border-green-400 bg-gradient-to-br from-green-50/80 to-emerald-100/80 dark:from-green-900/80 dark:to-emerald-900/80 shadow-xl scale-105' 
                  : 'border-blue-100 dark:border-blue-700 bg-white/70 dark:bg-gray-800/70 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-lg'
              }`}
            >
              {calc.planId === bestPlan?.planId && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 dark:bg-green-700 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-md ${
                  calc.planId === bestPlan?.planId 
                    ? 'bg-green-100 dark:bg-green-900' 
                    : 'bg-blue-100 dark:bg-blue-900'
                }`}>
                  <svg className={`w-6 h-6 ${
                    calc.planId === bestPlan?.planId 
                      ? 'text-green-600 dark:text-green-300' 
                      : 'text-blue-600 dark:text-blue-300'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">{calc.planName}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {plans.find(p => p.id === calc.planId)?.type === 'constant' ? 'Constant Rate' : 'Time-of-Use'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Daily</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(calc.dailyCost)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Monthly</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(calc.monthlyCost)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/80 dark:bg-gray-900/80 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Yearly</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrency(calc.yearlyCost)}</p>
                  </div>
                </div>

                <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg p-4 shadow-sm">
                  <h5 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Cost Breakdown</h5>
                  <div className="space-y-2">
                    {calc.breakdown.offPeakUsage > 0 ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Peak ({calc.breakdown.peakUsage.toFixed(1)} kWh)</span>
                          <span className="font-medium">{formatCurrency(calc.breakdown.peakCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Off-Peak ({calc.breakdown.offPeakUsage.toFixed(1)} kWh)</span>
                          <span className="font-medium">{formatCurrency(calc.breakdown.offPeakCost)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Usage ({calc.breakdown.peakUsage.toFixed(1)} kWh)</span>
                        <span className="font-medium">{formatCurrency(calc.breakdown.peakCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Daily Charge</span>
                      <span className="font-medium">{formatCurrency(calc.breakdown.dailyCharge)}</span>
                    </div>
                    {calc.breakdown.gstAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">GST (15%)</span>
                        <span className="font-medium">{formatCurrency(calc.breakdown.gstAmount)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-800 dark:text-gray-100">Total Daily Cost</span>
                        <span className="text-gray-800 dark:text-gray-100">{formatCurrency(calc.dailyCost)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Information */}
      {costCalculations.length > 1 && (
        <div className="bg-gradient-to-r from-green-100/70 to-blue-100/70 dark:from-green-900/70 dark:to-blue-900/70 border border-green-200 dark:border-green-700 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3 shadow-md">
              <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Potential Savings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const maxCost = Math.max(...costCalculations.map(c => c.dailyCost));
              const minCost = Math.min(...costCalculations.map(c => c.dailyCost));
              const dailySavings = maxCost - minCost;
              return (
                <>
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Daily Savings</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300">{formatCurrency(dailySavings)}</p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Monthly Savings</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300">{formatCurrency(dailySavings * 30)}</p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Yearly Savings</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-300">{formatCurrency(dailySavings * 365)}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlanComparison;
