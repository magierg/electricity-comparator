import { parseMeterCsv } from '../parseMeterCsv';

function halfHourLabels(): string[] {
  const labels: string[] = [];
  for (let interval = 0; interval < 48; interval += 1) {
    const startHour = Math.floor(interval / 2);
    const startMinute = interval % 2 === 0 ? '00' : '30';
    const endInterval = interval + 1;
    const endHour = Math.floor(endInterval / 2) % 24;
    const endMinute = endInterval % 2 === 0 ? '00' : '30';
    labels.push(
      `${String(startHour).padStart(2, '0')}:${startMinute} - ${String(endHour).padStart(2, '0')}:${endMinute}`,
    );
  }
  return labels;
}

function row(date: string, value: number, element = 'Consumption'): string {
  return ['ICP1', 'METER1', element, date, ...Array(48).fill(value)].join(',');
}

function csv(rows: string[], headers = ['ICP', 'Meter number', 'Meter element', 'Date', ...halfHourLabels()]): string {
  return [headers.join(','), ...rows].join('\n');
}

describe('parseMeterCsv', () => {
  it('parses a day of half-hour consumption into hourly totals', () => {
    const result = parseMeterCsv(csv([row('1/6/2025', 1)]));

    expect(result.days).toHaveLength(1);
    expect(result.days[0].isoDate).toBe('2025-06-01');
    expect(result.days[0].hourlyUsage).toHaveLength(24);
    expect(result.days[0].hourlyUsage[0]).toBe(2);
    expect(result.days[0].totalDaily).toBe(48);
    expect(result.average.totalDaily).toBe(48);
  });

  it('handles ISO dates, BOM, and CRLF line endings', () => {
    const text = `\uFEFF${csv([row('2025-06-02', 0.5)])}`.replace(/\n/g, '\r\n');
    const result = parseMeterCsv(text);

    expect(result.days[0].isoDate).toBe('2025-06-02');
    expect(result.days[0].totalDaily).toBe(24);
  });

  it('averages multiple days', () => {
    const result = parseMeterCsv(
      csv([row('1/6/2025', 1), row('2/6/2025', 2)]),
    );

    expect(result.days).toHaveLength(2);
    expect(result.average.totalDaily).toBe(72);
    expect(result.dateRange).toEqual({ start: '2025-06-01', end: '2025-06-02' });
  });

  it('ignores generation rows when a meter element column exists', () => {
    const result = parseMeterCsv(
      csv([
        row('1/6/2025', 1, 'Consumption'),
        row('1/6/2025', 99, 'Generation'),
      ]),
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].totalDaily).toBe(48);
  });

  it('rejects an empty file', () => {
    expect(() => parseMeterCsv('')).toThrow(/CSV file is empty/i);
  });

  it('rejects a file with only one interval column', () => {
    expect(() =>
      parseMeterCsv(csv([row('1/6/2025', 1)], ['Date', halfHourLabels()[0]])),
    ).toThrow(/Could not find any 30-minute usage columns/i);
  });

  it('rejects an odd number of interval columns', () => {
    expect(() =>
      parseMeterCsv(
        csv(
          [['ICP1', 'METER1', 'Consumption', '1/6/2025', '1', '1', '1'].join(',')],
          ['ICP', 'Meter number', 'Meter element', 'Date', ...halfHourLabels().slice(0, 3)],
        ),
      ),
    ).toThrow(/Expected an even number of 30-minute columns/i);
  });

  it('warns when the interval shape is incomplete', () => {
    const result = parseMeterCsv(
      csv(
        [['ICP1', 'METER1', 'Consumption', '1/6/2025', '1', '1', '1', '1'].join(',')],
        ['ICP', 'Meter number', 'Meter element', 'Date', ...halfHourLabels().slice(0, 4)],
      ),
    );

    expect(result.days).toHaveLength(1);
    expect(result.warnings.join(' ')).toMatch(/instead of 48/i);
  });

  it('warns when rows are skipped', () => {
    const result = parseMeterCsv(
      csv([row('1/6/2025', 1), row('not-a-date', 1)]),
    );

    expect(result.days).toHaveLength(1);
    expect(result.warnings.join(' ')).toMatch(/some rows were skipped/i);
  });

  it('rejects a file without a date and interval columns', () => {
    expect(() => parseMeterCsv('not,a,valid,csv\n1,2,3,4')).toThrow(
      /Invalid CSV format/i,
    );
  });

  it('rejects a file with no usable consumption rows', () => {
    expect(() =>
      parseMeterCsv(
        csv([row('1/6/2025', 0)]),
      ),
    ).toThrow(/No usable consumption rows/i);
  });
});
