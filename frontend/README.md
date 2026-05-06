# HeimPath - Frontend

HeimPath is a German Real Estate Navigator helping foreign investors and immigrants navigate property buying processes. The frontend provides guided journeys, document translation, financial calculators, and legal knowledge resources.

Built with [Vite](https://vitejs.dev/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [TanStack Query](https://tanstack.com/query), [TanStack Router](https://tanstack.com/router) and [Tailwind CSS](https://tailwindcss.com/).

## Requirements

- [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/)

## Quick Start

```bash
bun install
bun run dev
```

Then open your browser at http://localhost:5173/.

This live server is for local development with hot reload. For production-like testing, build the Docker image instead:

```bash
docker compose up --build frontend -d
```

Check the file `package.json` to see other available options.

## Code Structure

```
frontend/src/
├── assets/                  Static assets
├── common/
│   ├── constants/           Shared constants and configuration values
│   ├── styles/              Color tokens and shared styles
│   └── utils/               Shared utility functions
├── components/
│   ├── Calculators/         Financial calculators (Property Evaluation)
│   ├── Journey/             Journey wizard and step components
│   └── ui/                  Reusable UI primitives (shadcn/ui)
├── hooks/
│   ├── queries/             React Query hooks for data fetching
│   └── mutations/           React Query hooks for data mutations
├── models/                  TypeScript models for domain entities
├── routes/                  TanStack Router route definitions and pages
└── services/                API service layer for backend communication
```

## Key Features

### Guided Journeys

Step-by-step workflows guiding users through the German property buying process. Journeys are personalized based on user citizenship and property situation, with task tracking and progress indicators.

### Property Evaluation Calculator

A comprehensive investment property analysis tool located in `src/components/Calculators/PropertyEvaluationCalculator/`. It provides five sections:

* **Property Information** - Address, size, purchase price, and transaction fees (broker, notary, land registry, transfer tax). Tip: retrieve from the property listing (Expose).
* **Rent, Taxes, Forecast** - Monthly rent inputs, depreciation (AfA) settings, marginal tax rate, and forecast assumptions for cost, rent, and value increases. Tip: retrieve rent from the Expose.
* **Operating Costs** - Allocable and non-allocable management costs (house allowance, property tax, reserves) entered as absolute EUR/month values. Tip: retrieve from the annual settlement (Abrechnung).
* **Financing** - Loan percentage (of purchase price), interest rate, and initial repayment rate. Tip: retrieve from the bank offer.
* **Evaluation** - Calculated results including gross rental yield, cold rent factor, monthly cashflow (before and after tax), tax calculation with AfA depreciation, and return on equity.

### Document Translation

Integration with translator for translating German legal and financial documents, with risk warnings for terms requiring manual review.

## API Configuration

To connect to a remote API, set the environment variable `VITE_API_URL` in `frontend/.env`:

```env
VITE_API_URL=https://api.my-domain.example.com
```

## Generate Client

### Automatically

* Activate the backend virtual environment.
* From the top level project directory, run:

```bash
bash ./scripts/generate-client.sh
```

### Manually

* Start the Docker Compose stack.
* Download the OpenAPI JSON file from `http://localhost/api/v1/openapi.json` and copy it to `openapi.json` at the root of the `frontend` directory.
* Generate the frontend client:

```bash
bun run generate-client
```

Every time the backend changes (OpenAPI schema), regenerate the client following these steps.

## End-to-End Testing with Playwright

Start the Docker Compose stack:

```bash
docker compose up -d --wait backend
```

Run the tests:

```bash
bunx playwright test
```

Run tests in UI mode:

```bash
bunx playwright test --ui
```

Stop and clean up:

```bash
docker compose down -v
```

For more information, refer to the [Playwright documentation](https://playwright.dev/docs/intro).
