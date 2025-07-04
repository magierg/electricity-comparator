export interface UsagePattern {
  hourlyUsage: number[];
  totalDaily: number;
}

export interface ElectricityPlan {
  id: string;
  name: string;
  type: 'constant' | 'time-of-use';
  rate: number; // Rate per kWh for constant or peak rate for time-of-use
  peakHours: number[];
  offPeakRate: number;
  dailyCharge: number; // Daily fixed charge
  includeGST: boolean; // Whether GST is included in rates
}

export interface CostCalculation {
  planId: string;
  planName: string;
  dailyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  breakdown: {
    peakCost: number;
    offPeakCost: number;
    peakUsage: number;
    offPeakUsage: number;
    dailyCharge: number;
    gstAmount: number;
    totalBeforeGST: number;
  };
}
