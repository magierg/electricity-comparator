import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { UsagePattern, ElectricityPlan, CostCalculation } from '../types';

interface PlanComparisonProps {
  usagePattern: UsagePattern;
  plans: ElectricityPlan[];
  onPlansChange: (plans: ElectricityPlan[]) => void;
}

const PlanComparison = forwardRef(function PlanComparison(
  { usagePattern, plans, onPlansChange }: PlanComparisonProps,
  ref
) {
  const [costCalculations, setCostCalculations] = useState<CostCalculation[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userType, setUserType] = useState<'low' | 'standard'>('low');
  const [selectedRetailer, setSelectedRetailer] = useState<string>('all');

  useImperativeHandle(ref, () => ({
    setUserType
  }));

  // Example: mapping plan IDs to low/standard user rates and retailer
  const allPlans = [
    {
      id: 'ek-go250',
      retailer: 'Electric Kiwi',
      name: 'Go250 All Inclusive Residential',
      type: 'time-of-use',
      peakHours: [7,8,9,17,18,19],
      includeGST: true,
      userRates: {
        low: { dailyCharge: 1.72, rate: 0.3533, offPeakRate: 0.3179 },
        standard: { dailyCharge: 2.26, rate: 0.3175, offPeakRate: 0.2858 }
      }
    },
    {
      id: 'meridian-simple-flexi',
      retailer: 'Meridian Energy',
      name: 'Simple Flexi Plan Economy 24',
      type: 'constant',
      peakHours: [],
      includeGST: true,
      userRates: {
        low: { dailyCharge: 1.725, rate: 0.253 },
        standard: { dailyCharge: 2.26, rate: 0.253 }
      }
    }
    // Add more plans as needed
  ];

  // Filter plans by retailer
  const filteredPlans = selectedRetailer === 'all'
    ? allPlans
    : allPlans.filter(plan => plan.retailer === selectedRetailer);

  // Map filtered plans to ElectricityPlan[] with correct rates for user type
  const mappedPlans: ElectricityPlan[] = filteredPlans.map(plan => ({
    id: plan.id,
    name: plan.name,
    type: plan.type as 'constant' | 'time-of-use',
    rate: plan.userRates[userType].rate,
    offPeakRate: plan.userRates[userType].offPeakRate ?? 0,
    dailyCharge: plan.userRates[userType].dailyCharge,
    peakHours: plan.peakHours,
    includeGST: plan.includeGST
  }));

  // Update parent plans when retailer/userType changes
  useEffect(() => {
    onPlansChange(mappedPlans);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType, selectedRetailer]);

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

  const handlePlanUpdate = (planId: string, field: keyof ElectricityPlan, value: ElectricityPlan[keyof ElectricityPlan]) => {
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
      {/* Retailer Select */}
      <div className="flex items-center space-x-4 mb-2">
        <span className="font-medium text-purple-900">Retailer:</span>
        <select
          value={selectedRetailer}
          onChange={e => setSelectedRetailer(e.target.value)}
          className="px-3 py-2 rounded-lg border border-pink-300 bg-white text-purple-900 focus:ring-2 focus:ring-pink-300 focus:border-transparent shadow-sm"
        >
          <option value="all">All Retailers</option>
          <option value="Electric Kiwi">Electric Kiwi</option>
          <option value="Meridian Energy">Meridian Energy</option>
        </select>
      </div>
      {/* User Type Toggle */}
      <div className="flex items-center space-x-4 mb-2">
        <span className="font-medium text-purple-900">User Type:</span>
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            name="userType"
            value="low"
            checked={userType === 'low'}
            onChange={() => setUserType('low')}
            className="accent-pink-500 focus:ring-pink-300"
          />
          <span>Low User</span>
        </label>
        <label className="flex items-center space-x-1">
          <input
            type="radio"
            name="userType"
            value="standard"
            checked={userType === 'standard'}
            onChange={() => setUserType('standard')}
            className="accent-pink-500 focus:ring-pink-300"
          />
          <span>Standard User</span>
        </label>
      </div>

      {/* Settings Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-purple-900">Plan Settings</h3>
          <p className="text-sm text-purple-700">Customize your electricity plan rates</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-white/80 border border-pink-300 hover:bg-pink-50 rounded-lg transition-colors flex items-center space-x-2 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
        >
          <svg className={`w-5 h-5 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span>{showSettings ? 'Hide' : 'Show'} Settings</span>
        </button>
      </div>

      {/* Plan Settings */}
      {showSettings && (
        <div className="bg-white/90 rounded-2xl p-6 space-y-6 shadow-lg border border-pink-200">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl p-4 shadow-md border border-purple-100">
              <h4 className="font-semibold text-purple-900 mb-4">{plan.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-900 mb-2">
                    {plan.type === 'constant' ? 'Rate' : 'Peak Rate'} ($/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={plan.rate}
                    onChange={(e) => handlePlanUpdate(plan.id, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-transparent bg-white shadow-sm text-purple-900"
                  />
                </div>
                {plan.type === 'time-of-use' && (
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-2">
                      Off-Peak Rate ($/kWh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={plan.offPeakRate}
                      onChange={(e) => handlePlanUpdate(plan.id, 'offPeakRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-transparent bg-white shadow-sm text-purple-900"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-purple-900 mb-2">
                    Daily Charge ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={plan.dailyCharge}
                    onChange={(e) => handlePlanUpdate(plan.id, 'dailyCharge', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-300 focus:border-transparent bg-white shadow-sm text-purple-900"
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
                      className="mr-2 rounded focus:ring-pink-300 accent-pink-500"
                    />
                    <span className="text-sm font-medium text-purple-900">Rates include GST (15%)</span>
                  </label>
                </div>
                {plan.type === 'time-of-use' && (
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-2">
                      Peak Hours
                    </label>
                    <div className="text-sm text-purple-700 bg-purple-50 p-2 rounded shadow-sm">
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
          <h3 className="text-lg font-semibold text-purple-900">Cost Comparison</h3>
          {bestPlan && (
            <div className="flex items-center space-x-2 text-pink-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Best Plan: {bestPlan.planName}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {costCalculations.map((calc) => (
            <div 
              key={calc.planId}
              className={`relative rounded-2xl p-6 border-2 transition-all duration-300 backdrop-blur-md min-w-0 overflow-hidden ${
                calc.planId === bestPlan?.planId 
                  ? 'border-pink-400 bg-gradient-to-br from-pink-50/80 to-purple-100/80 shadow-xl scale-105' 
                  : 'border-purple-100 bg-white/70 hover:border-pink-200 hover:shadow-lg'
              }`}
            >
              {calc.planId === bestPlan?.planId && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 shadow-md ${
                  calc.planId === bestPlan?.planId 
                    ? 'bg-pink-100' 
                    : 'bg-purple-100'
                }`}>
                  <svg className={`w-6 h-6 ${
                    calc.planId === bestPlan?.planId 
                      ? 'text-pink-600' 
                      : 'text-purple-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-purple-900">{calc.planName}</h4>
                  <p className="text-sm text-purple-700">
                    {plans.find(p => p.id === calc.planId)?.type === 'constant' ? 'Constant Rate' : 'Time-of-Use'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white/80 rounded-lg shadow-sm min-w-0 overflow-x-auto">
                    <p className="text-sm text-purple-700 mb-1">Daily</p>
                    <p className="text-lg font-bold text-purple-900 break-words whitespace-normal">{formatCurrency(calc.dailyCost)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/80 rounded-lg shadow-sm min-w-0 overflow-x-auto">
                    <p className="text-sm text-purple-700 mb-1">Monthly</p>
                    <p className="text-lg font-bold text-purple-900 break-words whitespace-normal">{formatCurrency(calc.monthlyCost)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/80 rounded-lg shadow-sm min-w-0 overflow-x-auto">
                    <p className="text-sm text-purple-700 mb-1">Yearly</p>
                    <p className="text-lg font-bold text-purple-900 break-words whitespace-normal">{formatCurrency(calc.yearlyCost)}</p>
                  </div>
                </div>
                <div className="bg-white/90 rounded-lg p-4 shadow-sm">
                  <h5 className="font-semibold text-purple-900 mb-3">Cost Breakdown</h5>
                  <div className="space-y-2">
                    {calc.breakdown.offPeakUsage > 0 ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-purple-700">Peak ({calc.breakdown.peakUsage.toFixed(1)} kWh)</span>
                          <span className="font-medium">{formatCurrency(calc.breakdown.peakCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-purple-700">Off-Peak ({calc.breakdown.offPeakUsage.toFixed(1)} kWh)</span>
                          <span className="font-medium">{formatCurrency(calc.breakdown.offPeakCost)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">Usage ({calc.breakdown.peakUsage.toFixed(1)} kWh)</span>
                        <span className="font-medium">{formatCurrency(calc.breakdown.peakCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">Daily Charge</span>
                      <span className="font-medium">{formatCurrency(calc.breakdown.dailyCharge)}</span>
                    </div>
                    {calc.breakdown.gstAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-700">GST (15%)</span>
                        <span className="font-medium">{formatCurrency(calc.breakdown.gstAmount)}</span>
                      </div>
                    )}
                    <div className="border-t border-pink-200 pt-2 mt-2">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-purple-900">Total Daily Cost</span>
                        <span className="text-purple-900">{formatCurrency(calc.dailyCost)}</span>
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
        <div className="bg-gradient-to-r from-pink-100/70 to-purple-100/70 border border-pink-200 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mr-3 shadow-md">
              <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-purple-900">Potential Savings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const maxCost = Math.max(...costCalculations.map(c => c.dailyCost));
              const minCost = Math.min(...costCalculations.map(c => c.dailyCost));
              const dailySavings = maxCost - minCost;
              return (
                <>
                  <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-purple-700 mb-1">Daily Savings</p>
                    <p className="text-2xl font-bold text-pink-600">{formatCurrency(dailySavings)}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-purple-700 mb-1">Monthly Savings</p>
                    <p className="text-2xl font-bold text-pink-600">{formatCurrency(dailySavings * 30)}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-purple-700 mb-1">Yearly Savings</p>
                    <p className="text-2xl font-bold text-pink-600">{formatCurrency(dailySavings * 365)}</p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});

export default PlanComparison;
