import type { UsagePattern } from '../types';

export interface ParsedUsageDay {
  date: string;
  isoDate: string;
  hourlyUsage: number[];
  totalDaily: number;
}

export interface ParsedUsage {
  days: ParsedUsageDay[];
  average: UsagePattern;
  dateRange?: { start: string; end: string };
  warnings: string[];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseDate(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toNumber(value: string | undefined): number {
  if (value === undefined) return 0;
  const text = value.replace(/[$,\s]/g, '').trim();
  if (!text || text === '-') return 0;
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function isHalfHourHeader(value: string): boolean {
  return /\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(value);
}

export function parseMeterCsv(csvText: string): ParsedUsage {
  const rows = parseCsv(csvText.replace(/^\uFEFF/, ''));
  if (rows.length === 0) {
    throw new Error('The CSV file is empty.');
  }

  const headerIndex = rows.findIndex(
    (row) => row.some((cell) => /date/i.test(cell)) && row.some(isHalfHourHeader),
  );

  if (headerIndex === -1) {
    throw new Error(
      'Invalid CSV format. Expected a Date column and 30-minute interval columns.',
    );
  }

  const header = rows[headerIndex];
  const dateColumn = header.findIndex((cell) => /date/i.test(cell));
  const intervalColumns = header
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => isHalfHourHeader(cell))
    .map(({ index }) => index);

  if (dateColumn === -1) {
    throw new Error('Could not find a Date column in the CSV.');
  }
  if (intervalColumns.length < 2) {
    throw new Error('Could not find any 30-minute usage columns in the CSV.');
  }
  if (intervalColumns.length % 2 !== 0) {
    throw new Error(
      `Expected an even number of 30-minute columns, found ${intervalColumns.length}.`,
    );
  }

  const meterElementColumn = header.findIndex((cell) =>
    /meter\s*element/i.test(cell),
  );
  const warnings: string[] = [];
  const days = new Map<string, ParsedUsageDay>();

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row || row.length === 0) continue;

    if (
      meterElementColumn !== -1 &&
      row[meterElementColumn] &&
      !/consumption/i.test(row[meterElementColumn])
    ) {
      continue;
    }

    const date = parseDate(row[dateColumn] ?? '');
    if (!date) continue;

    const values = intervalColumns.map((column) => toNumber(row[column]));
    const hasSomeData = values.some((value) => value !== 0);
    if (!hasSomeData) continue;

    const hourlyUsage = Array.from({ length: values.length / 2 }, (_, hour) =>
      values[hour * 2] + values[hour * 2 + 1],
    );
    const totalDaily = hourlyUsage.reduce((sum, value) => sum + value, 0);
    const isoDate = toIsoDate(date);

    days.set(isoDate, {
      date: row[dateColumn].trim(),
      isoDate,
      hourlyUsage,
      totalDaily,
    });
  }

  if (days.size === 0) {
    throw new Error('No usable consumption rows were found in the CSV.');
  }

  const parsedDays = Array.from(days.values()).sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate),
  );

  if (intervalColumns.length !== 48) {
    warnings.push(
      `Found ${intervalColumns.length} half-hour columns instead of 48. The usage shape may be incomplete.`,
    );
  }
  if (parsedDays.length !== rows.length - headerIndex - 1) {
    warnings.push('Some rows were skipped because their date or usage could not be read.');
  }

  const averageHourly = Array.from({ length: 24 }, (_, hour) => {
    const total = parsedDays.reduce((sum, day) => sum + (day.hourlyUsage[hour] ?? 0), 0);
    return total / parsedDays.length;
  });
  const averageDaily = averageHourly.reduce((sum, value) => sum + value, 0);

  return {
    days: parsedDays,
    average: {
      hourlyUsage: averageHourly,
      totalDaily: averageDaily,
    },
    dateRange: {
      start: parsedDays[0].isoDate,
      end: parsedDays[parsedDays.length - 1].isoDate,
    },
    warnings,
  };
}
