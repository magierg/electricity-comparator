# Electricity Plan Comparator

A modern React application for comparing different electricity plans (constant rate vs time-of-use) based on your daily usage patterns.

## Features

- **Usage Pattern Input**: Enter your hourly electricity usage or select from typical patterns
- **Plan Comparison**: Compare constant rate vs time-of-use electricity plans
- **Cost Calculation**: Real-time cost calculations and comparisons
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Interactive UI**: Modern, clean interface built with Tailwind CSS

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Chart.js (ready for visualization features)
- **Development**: ESLint for code quality

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building

Build the project for production:
```bash
npm run build
```

### Preview

Preview the production build:
```bash
npm run preview
```

## Usage

1. **Select Usage Pattern**: Choose from predefined patterns (Residential, Business, Flat) or enter custom hourly usage
2. **Configure Plans**: Adjust electricity plan rates and peak hours
3. **Compare Costs**: View side-by-side comparison of daily, monthly, and yearly costs
4. **Identify Savings**: See which plan offers the best value for your usage pattern

## Plan Types

### Constant Rate Plan
- Single rate applied to all usage throughout the day
- Simple billing structure
- Predictable costs

### Time-of-Use Plan
- Different rates for peak and off-peak hours
- Lower rates during off-peak periods
- Potential savings for users who can shift usage

## Project Structure

```
src/
├── components/
│   ├── UsageInput.tsx    # Usage pattern input component
│   └── PlanComparison.tsx # Plan comparison and cost calculation
├── types.ts              # TypeScript interfaces
├── App.tsx               # Main application component
└── main.tsx              # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).
