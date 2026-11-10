import { getChartTheme } from '../chartTheme';

describe('getChartTheme', () => {
  it('returns the light palette by default', () => {
    const theme = getChartTheme('light');

    expect(theme.tickColor).toBe('#64748b');
    expect(theme.tooltipBackground).toContain('255, 255, 255');
  });

  it('returns a dark palette with legible text and tooltip colours', () => {
    const light = getChartTheme('light');
    const dark = getChartTheme('dark');

    expect(dark).not.toEqual(light);
    expect(dark.tickColor).not.toBe(light.tickColor);
    expect(dark.gridColor).not.toBe(light.gridColor);
    expect(dark.tooltipBackground).not.toBe(light.tooltipBackground);
    expect(dark.tooltipTitleColor).toBe('#f8fafc');
    expect(dark.tooltipBodyColor).toBe('#e2e8f0');
    expect(dark.legendColor).toBe('#cbd5e1');
  });
});
