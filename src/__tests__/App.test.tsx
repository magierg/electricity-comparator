import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';

jest.mock('../components/UsageChart', () => ({
  __esModule: true,
  default: ({ usage }: { usage: { totalDaily: number } }) => (
    <div data-testid="usage-chart">{usage.totalDaily}</div>
  ),
}));

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

function meterCsv(): string {
  return [
    ['ICP', 'Meter number', 'Meter element', 'Date', ...halfHourLabels()].join(','),
    ['ICP1', 'METER1', 'Consumption', '1/6/2025', ...Array(48).fill(1)].join(','),
  ].join('\n');
}

const originalFetch = globalThis.fetch;

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

beforeEach(() => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    text: async () => meterCsv(),
  }) as unknown as typeof fetch;
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  Reflect.deleteProperty(window, 'matchMedia');
});

async function renderApp() {
  render(<App />);
  await screen.findByText(/sample data loaded/i);
}

describe('App', () => {
  it('loads sample data and renders the ranked comparison', async () => {
    await renderApp();

    expect(
      screen.getByRole('heading', { name: /wellington electricity plan comparison/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/17 plans/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/gst included/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /plans ranked by annual cost/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/cheapest plan for your usage/i)).toBeInTheDocument();
    expect(screen.getAllByText(/best value/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('usage-chart')).toBeInTheDocument();
  });

  it('switches to an annual estimate and suggests the low user type', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('tab', { name: /annual estimate/i }));
    const annualInput = screen.getByLabelText(/annual usage/i) as HTMLInputElement;
    fireEvent.change(annualInput, { target: { value: '5000' } });

    expect(annualInput.value).toBe('5000');
    expect(screen.getByText(/suggested:/i).parentElement).toHaveTextContent(
      /low user/i,
    );
  });

  it('selects a current plan and shows potential savings', async () => {
    await renderApp();

    const currentPlan = screen.getByLabelText(/your current plan/i) as HTMLSelectElement;
    fireEvent.change(currentPlan, {
      target: { value: currentPlan.options[currentPlan.options.length - 1].value },
    });

    expect(await screen.findByText(/you could save/i)).toBeInTheDocument();
    expect(screen.getByText(/switching from/i)).toBeInTheDocument();
  });

  it('filters plans by provider and clears the filters', async () => {
    await renderApp();

    const provider = screen.getByLabelText(/provider/i) as HTMLSelectElement;
    fireEvent.change(provider, { target: { value: 'Contact Energy' } });

    expect(screen.getByText(/plans shown after filters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    const countAfterClear = screen.getByText(/plans shown/i);
    expect(countAfterClear).toHaveTextContent(/\d+ plans shown/i);
    expect(countAfterClear).not.toHaveTextContent(/after filters/i);
    expect(
      screen.queryByRole('button', { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it('expands peak settings and applies a preset', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: /customise/i }));
    const peakGroup = screen.getByRole('group', { name: /peak hours/i });
    const hour7 = within(peakGroup).getByRole('button', { name: '07' });
    expect(hour7).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(hour7);
    const updatedPeakGroup = screen.getByRole('group', { name: /peak hours/i });
    expect(within(updatedPeakGroup).getByRole('button', { name: '07' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: /evening only/i }));
    expect(
      screen.getByText(/17:00, 18:00, 19:00, 20:00, 21:00/i),
    ).toBeInTheDocument();
  });

  it('changes the user type and restores the suggestion', async () => {
    await renderApp();

    expect(screen.getByRole('button', { name: /standard user/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /low user/i }));
    expect(screen.getByRole('button', { name: /low user/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /use suggestion/i }));
    expect(screen.getByRole('button', { name: /standard user/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('expands a plan to show the cost breakdown', async () => {
    await renderApp();

    const showButtons = screen.getAllByRole('button', { name: /^show .* details$/i });
    fireEvent.click(showButtons[0]);

    expect(screen.getByText(/cost breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/plan details/i)).toBeInTheDocument();
    expect(screen.getByText(/effective usage rate/i)).toBeInTheDocument();
    expect(screen.getByText(/total per day/i)).toBeInTheDocument();
  });

  it('edits custom hourly usage and clamps negative values', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('tab', { name: /custom hours/i }));
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(24);

    const firstHour = inputs[0] as HTMLInputElement;
    fireEvent.change(firstHour, { target: { value: '3.5' } });
    expect(firstHour.value).toBe('3.5');

    fireEvent.change(firstHour, { target: { value: '-2' } });
    expect(firstHour.value).toBe('0');
  });

  it('starts in the system dark theme', async () => {
    mockMatchMedia(true);
    await renderApp();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button', { name: /^dark$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('uses a stored theme instead of the system theme', async () => {
    mockMatchMedia(false);
    window.localStorage.setItem('electricity-theme', 'dark');
    await renderApp();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles the theme and persists the manual choice', async () => {
    await renderApp();

    fireEvent.click(screen.getByRole('button', { name: /^dark$/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('electricity-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: /^light$/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('electricity-theme')).toBe('light');
  });
});
