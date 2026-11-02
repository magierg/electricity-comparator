import { render, screen } from '@testing-library/react';
import UsageChart from '../UsageChart';
import type { UsagePattern } from '../../types';

interface ChartMockData {
  labels: string[];
  datasets: Array<{ data: number[] }>;
}

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: ChartMockData }) => (
    <div data-testid="chart">
      <div data-testid="chart-labels">
        {data.labels.map((label, index) => (
          <span key={index} data-testid={`label-${index}`}>
            {label}
          </span>
        ))}
      </div>
      <div data-testid="chart-data">
        {data.datasets[0].data.map((value, index) => (
          <span key={index} data-testid={`data-${index}`}>
            {value}
          </span>
        ))}
      </div>
    </div>
  ),
}));

describe('UsageChart', () => {
  const usage: UsagePattern = {
    hourlyUsage: Array(24).fill(1),
    totalDaily: 24,
  };
  const schedule = {
    peak: [17, 18, 19],
    shoulder: [20],
  };

  it('renders the usage summary and chart', () => {
    render(<UsageChart usage={usage} schedule={schedule} />);

    expect(screen.getByText('Daily usage shape')).toBeInTheDocument();
    expect(screen.getByText(/24 kWh per day/i)).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });

  it('renders 24 hour labels', () => {
    render(<UsageChart usage={usage} schedule={schedule} />);

    expect(screen.getByTestId('label-0')).toHaveTextContent('00:00');
    expect(screen.getByTestId('label-23')).toHaveTextContent('23:00');
  });

  it('renders all 24 usage values', () => {
    render(<UsageChart usage={usage} schedule={schedule} />);

    for (let hour = 0; hour < 24; hour += 1) {
      expect(screen.getByTestId(`data-${hour}`)).toHaveTextContent('1');
    }
  });

  it('shows the peak, shoulder, and off-peak legend', () => {
    render(<UsageChart usage={usage} schedule={schedule} />);

    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.getByText('Shoulder')).toBeInTheDocument();
    expect(screen.getByText('Off-peak')).toBeInTheDocument();
  });

  it('applies a custom className', () => {
    const { container } = render(
      <UsageChart usage={usage} schedule={schedule} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
