const currencyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  maximumFractionDigits: 0,
});

const kWhFormatter = new Intl.NumberFormat('en-NZ', {
  maximumFractionDigits: 1,
});

const rateFormatter = new Intl.NumberFormat('en-NZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatCurrencyCompact(amount: number): string {
  return compactCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatKwh(amount: number): string {
  return `${kWhFormatter.format(Number.isFinite(amount) ? amount : 0)} kWh`;
}

export function formatRate(rate: number): string {
  return `${rateFormatter.format(Number.isFinite(rate) ? rate : 0)}/kWh`;
}

export function formatDate(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return String(date);
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatHourRange(hours: number[]): string {
  if (hours.length === 0) return 'None';
  return hours.map(formatHour).join(', ');
}
