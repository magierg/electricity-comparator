import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CHART_COLORS } from '../constants';
import { getChartTheme } from '../lib/chartTheme';
import { formatHour, formatKwh } from '../lib/format';
import type { Theme } from '../lib/theme';
import type { PeakSchedule, UsagePattern } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface UsageChartProps {
  usage: UsagePattern;
  schedule: PeakSchedule;
  theme: Theme;
  className?: string;
}

export default function UsageChart({
  usage,
  schedule,
  theme,
  className = '',
}: UsageChartProps) {
  const chartTheme = getChartTheme(theme);
  const peakHours = new Set(schedule.peak);
  const shoulderHours = new Set(schedule.shoulder);
  const labels = Array.from({ length: 24 }, (_, hour) => formatHour(hour));

  const colors = usage.hourlyUsage.map((_, hour) => {
    if (peakHours.has(hour)) return CHART_COLORS.peak;
    if (shoulderHours.has(hour)) return CHART_COLORS.shoulder;
    return CHART_COLORS.offPeak;
  });
  const borders = usage.hourlyUsage.map((_, hour) => {
    if (peakHours.has(hour)) return CHART_COLORS.peakBorder;
    if (shoulderHours.has(hour)) return CHART_COLORS.shoulderBorder;
    return CHART_COLORS.offPeakBorder;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Usage (kWh)',
        data: usage.hourlyUsage,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTheme.tooltipBackground,
        titleColor: chartTheme.tooltipTitleColor,
        bodyColor: chartTheme.tooltipBodyColor,
        borderColor: chartTheme.tooltipBorderColor,
        borderWidth: 1,
        callbacks: {
          title: (items) => {
            const item = items[0];
            return item ? `Hour starting ${labels[item.dataIndex]}` : '';
          },
          label: (item: TooltipItem<'bar'>) => {
            const value = item.parsed.y ?? 0;
            return `${formatKwh(value)} used`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: chartTheme.tickColor,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartTheme.gridColor },
        ticks: {
          color: chartTheme.tickColor,
          callback: (value) => `${value} kWh`,
        },
      },
    },
  };

  const total = usage.totalDaily;
  const annual = total * 365;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily usage shape</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatKwh(total)} per day · {formatKwh(annual)} per year
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
            Peak
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-600" aria-hidden="true" />
            Shoulder
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-400 dark:bg-slate-500" aria-hidden="true" />
            Off-peak
          </span>
        </div>
      </div>
      <div className="mt-4 h-56">
        <Bar data={data} options={options} aria-label="Hourly electricity usage chart" />
      </div>
    </div>
  );
}
