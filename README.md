# Wellington Electricity Plan Comparison

A React app for comparing real Wellington electricity plans against your household usage. It estimates annual, monthly, and daily costs, ranks plans by ongoing annual cost, and shows potential savings against a plan you select as your current one.

The plan data comes from the **MoneyHub Power Comparison, October 2026 (Wellington)** dataset. All rates, daily charges, and the Electricity Authority levy are stored **GST-inclusive**.

## Features

- **Real plan data** — 17 Wellington plans across standard, EV, and bundle categories.
- **Low and standard user rates** — separate rates for each user type, with an automatic 8,000 kWh/year suggestion.
- **Three usage inputs**
  - Quick annual estimate with evening, daytime, or flat usage shapes.
  - Custom 24-hour usage entry.
  - Half-hour meter CSV upload, with average or single-day selection.
- **Realistic cost calculation** — flat, peak/off-peak, and peak/shoulder/off-peak pricing, daily charges, and EA levies.
- **Configurable peak windows** — the source data does not publish retailer-specific peak times, so peak and shoulder windows are adjustable.
- **Plan ranking and filters** — filter by provider or plan type, then expand any plan for a full cost breakdown.
- **Current-plan comparison** — select your current plan to see estimated annual savings.
- **First-year estimate** — shows the effect of one-off credits, percentage discounts, and free-power hours alongside the ongoing annual cost.

## Getting started

Requires **Node.js 24 LTS**.

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest unit tests |
| `npm run test:coverage` | Run unit tests with coverage |
| `npm run test:e2e` | Run the Playwright end-to-end tests |
| `npm run data:plans` | Regenerate the plan dataset from the source CSV |
| `npm run storybook` | Start Storybook |
| `npm run build-storybook` | Build Storybook |

## Plan data

The generated dataset lives in `src/data/wellington-plans.ts`. To regenerate it:

```bash
npm run data:plans
```

The generator reads `data/october_2026_moneyhub_wellington.csv`, maps the standard and low-user sections, converts the source rates to GST-inclusive values, and validates the result against MoneyHub's published annual totals before and after discounts. It writes a max delta of about $0.06. The workbook snapshot is kept at `data/october_2026_moneyhub_power_comparison_-_published.xlsm`. To refresh from a new workbook, export the Wellington sheet as a values-only CSV, replace the CSV, then run `npm run data:plans`.

Two source anomalies are skipped during annual validation and documented in `scripts/build-plans.mjs`:

- EV plan annual estimates include extra EV charging that is not reflected in the published household rates.
- Octopus low-user annual summaries double-count the variable charge.

The detailed rates are still used for those plans; only the source annual-estimate comparison is skipped.

## Assumptions and limitations

- **Peak windows are not in the source data.** The app defaults to a configurable peak/shoulder schedule and applies it to every plan. Change the windows in the "Peak windows" card to match your plan.
- **Usage is treated as a representative day.** Uploaded data is averaged across the selected days unless you choose a specific day.
- **Estimates are a guide.** Retailer pricing and discount eligibility change. Confirm current rates and terms with the provider before switching.
- The dataset is Wellington-only and based on October 2026 pricing.
- Free-power offers are estimated from the source's benchmark usage and scaled to your annual usage; actual value depends on when you use the free hours.

## Project structure

```text
src/
├── components/          # UI components
├── data/                # Generated plan dataset
├── lib/                 # Cost calculator, CSV parser, formatting, usage helpers
├── types.ts             # Shared types
├── constants.ts         # GST, thresholds, peak presets, palette
├── App.tsx              # Main comparison flow
└── main.tsx             # Entry point
scripts/
└── build-plans.mjs      # Plan data generator
e2e/
└── main-flow.spec.ts    # Playwright tests
```

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- Chart.js / react-chartjs-2
- Jest 30 + Testing Library
- Playwright
- Storybook 10
