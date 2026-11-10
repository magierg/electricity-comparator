import type { Theme } from './theme';

export interface ChartTheme {
  tickColor: string;
  gridColor: string;
  tooltipBackground: string;
  tooltipTitleColor: string;
  tooltipBodyColor: string;
  tooltipBorderColor: string;
  legendColor: string;
  legendSwatchBorder: string;
}

const CHART_THEMES: Record<Theme, ChartTheme> = {
  light: {
    tickColor: '#64748b',
    gridColor: 'rgba(148, 163, 184, 0.18)',
    tooltipBackground: 'rgba(255, 255, 255, 0.96)',
    tooltipTitleColor: '#0f172a',
    tooltipBodyColor: '#334155',
    tooltipBorderColor: 'rgba(148, 163, 184, 0.4)',
    legendColor: '#334155',
    legendSwatchBorder: 'rgba(15, 23, 42, 0.15)',
  },
  dark: {
    tickColor: '#cbd5e1',
    gridColor: 'rgba(148, 163, 184, 0.22)',
    tooltipBackground: 'rgba(15, 23, 42, 0.96)',
    tooltipTitleColor: '#f8fafc',
    tooltipBodyColor: '#e2e8f0',
    tooltipBorderColor: 'rgba(148, 163, 184, 0.45)',
    legendColor: '#cbd5e1',
    legendSwatchBorder: 'rgba(226, 232, 240, 0.35)',
  },
};

export function getChartTheme(theme: Theme): ChartTheme {
  return CHART_THEMES[theme];
}
