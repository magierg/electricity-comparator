import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatHour,
  formatHourRange,
  formatKwh,
  formatRate,
} from '../format';

describe('format helpers', () => {
  it('formats currency and falls back to zero for non-finite values', () => {
    expect(formatCurrency(12.5)).toContain('12.50');
    expect(formatCurrency(Number.NaN)).toContain('0.00');
    expect(formatCurrencyCompact(1234.56)).toContain('1,235');
  });

  it('formats kWh and rates', () => {
    expect(formatKwh(12.34)).toBe('12.3 kWh');
    expect(formatKwh(Number.NaN)).toBe('0 kWh');
    expect(formatRate(0.1234)).toBe('0.123/kWh');
    expect(formatRate(Number.NaN)).toBe('0.00/kWh');
  });

  it('formats valid dates and returns invalid input unchanged', () => {
    expect(formatDate('2025-06-01')).toMatch(/1 Jun 2025/);
    expect(formatDate(new Date(2025, 5, 1))).toMatch(/1 Jun 2025/);
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('formats hours and hour ranges', () => {
    expect(formatHour(7)).toBe('07:00');
    expect(formatHour(23)).toBe('23:00');
    expect(formatHourRange([])).toBe('None');
    expect(formatHourRange([7, 8, 17])).toBe('07:00, 08:00, 17:00');
  });
});
