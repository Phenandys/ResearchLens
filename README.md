# ResearchLens

**ResearchLens** is a scientific research paper discovery dashboard built with Angular 21, TypeScript, Express, Tailwind CSS, and Chart.js. It integrates directly with the [CORE API v3](https://api.core.ac.uk/docs/v3) to enable Boolean keyword searches, configurable result limits, clean metadata inspection, and publication-year trend visualization.

---

## Key Features

- **Boolean Search Engine**: Supports single keywords, `AND`, `OR`, `NOT`, exact phrases (`"..."`), field filters (`title:`, `yearPublished>=`), and nested parentheses such as `(drone AND (package OR delivery))`. Boolean expressions are forwarded verbatim to CORE without text rewriting.
- **Input Validation**: Client-side debounced syntax validation (balanced parentheses, closed quotes, valid operator placement) paired with matching server-side validation on the Express proxy.
- **Configurable Result Limits & Pagination**: Retrieve `10`, `20`, `50`, or `100` works per request and page through results using CORE's `limit` and `offset` parameters.
- **Secure Express API Proxy**: Keeps `CORE_API_KEY` strictly on the server via `Authorization: Bearer <token>`, parses CORE rate-limit headers (`x-ratelimit-*`), and surfaces structured errors.
- **Publication-Year Visualization**: Interactive Chart.js bar chart grouping retrieved papers chronologically by publication year, explicitly disclosing data scope (retrieved sample vs. total CORE hits) and tracking undated records.
- **Interactive Filtering & Utilities**:
  - Click any chart bar to filter retrieved papers by publication year.
  - Sort retrieved papers by CORE relevance, newest first, or oldest first.
  - One-click **Copy DOI**, **Copy URL**, and direct external links to source papers.
  - **Export CSV** (RFC-4180 escaped) of the currently displayed results.
  - Persistent **Recent Search History** (`localStorage`, SSR-safe) and URL query-parameter syncing (`?q=...&limit=...&offset=...`).
  - Expandable abstracts and author lists with honest fallbacks for missing metadata.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Angular 21 (Zoneless, Standalone Components, Signals, Reactive Forms, Router, HttpClient) |
| Language | TypeScript 5.9 (`strict: true`) |
| Reactive Streams | RxJS (`switchMap`, `debounceTime`, `distinctUntilChanged`, `takeUntilDestroyed`) |
| Styling & Icons | Tailwind CSS v4, Angular Material Icons (`@angular/material/icon`) |
| Data Visualization | Chart.js 4 |
| Backend / SSR Proxy | Node.js, Express 5 (`src/server.ts`, `src/server/*`) |
| Testing | Vitest + Angular Unit Test Builder + `HttpTestingController` |
| Linting | ESLint 9 + `angular-eslint` (including template accessibility rules) |

---

## Architecture Overview

```text
src/
├── server.ts                              # Express 5 + Angular SSR server mounting /api/core before SSR catch-all
├── server/
│   ├── core.routes.ts                     # GET /api/core/search and GET /api/core/health
│   ├── core-api.service.ts                # CORE API v3 client, Bearer auth, timeout, and HTTP 429/4xx/5xx mapping
│   ├── core-api.service.spec.ts           # Backend CORE proxy unit tests
│   ├── validation.ts                      # Server-side query, limit, offset, and Boolean syntax validation
│   └── validation.spec.ts                 # Backend validation tests
└── app/
    ├── app.config.ts                      # Zoneless Angular providers (HttpClient with fetch, Router)
    ├── app.routes.ts                      # Lazy-loaded Dashboard route
    ├── models/
    │   ├── core-response.model.ts         # Raw CORE API v3 & proxy response TypeScript interfaces
    │   └── paper.model.ts                 # Normalized ResearchPaper, aggregation, sort, and example models
    ├── services/
    │   ├── core-api.ts                    # Angular HttpClient service + RxJS error normalization
    │   ├── core-api.spec.ts               # HttpTestingController tests
    │   └── search-history.ts              # SSR-safe localStorage-backed search history signal store
    ├── utils/
    │   ├── boolean-query.util.ts          # Boolean expression inspector + Angular Reactive Forms validator
    │   ├── core-mapper.util.ts            # Defensive CORE API v3 record mapper with zero data fabrication
    │   ├── publication-aggregation.util.ts# Chronological publication-year grouping + undated counter
    │   └── csv-export.util.ts             # RFC-4180 CSV builder and browser download trigger
    ├── components/
    │   ├── navbar/navbar.ts               # Sticky navigation bar with brand mark and CSV export CTA
    │   ├── search-bar/search-bar.ts       # Reactive search form, operator helpers, limits, examples, history
    │   ├── paper-card/paper-card.ts       # Research paper card with copy DOI/URL and expandable abstract
    │   ├── results-list/results-list.ts   # Loading skeletons, error/429 banner, sort, pagination, empty states
    │   ├── publication-chart/             # Chart.js bar chart with scope disclosure & click-to-filter
    │   └── boolean-guide/                 # Interactive CORE Boolean syntax reference
    └── pages/
        └── dashboard/dashboard.component.ts # Responsive DashboardComponent with search, limits, results & chart
```

---

## Prerequisites

- **Node.js**: v20.19+ or v22+
- **npm**: v10+
- **CORE API Key** *(strongly recommended)*: Obtain a free API key to avoid strict shared-IP rate limits.

---

## Installation

```bash
git clone <your-repository-url>
cd researchlens
npm install
```

---

## Environment Variable Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your CORE API key:

```env
CORE_API_KEY="your_actual_core_api_key_here"
CORE_API_BASE_URL="https://api.core.ac.uk/v3"
PORT="4000"
APP_URL="http://localhost:3000"
```

> **Security Note**: `.env` is ignored by `.gitignore`. Never commit real API credentials to Git. `CORE_API_KEY` is read exclusively by the Node/Express backend and is never sent to the browser bundle.

### How to Obtain a CORE API Key

1. Visit [https://core.ac.uk/services/api](https://core.ac.uk/services/api).
2. Select **Get API Key** (free tier available for research and development).
3. Complete registration and verify your email address.
4. Copy the issued API key into `CORE_API_KEY` in your local `.env` file (or export it in your shell: `export CORE_API_KEY="your_key"`).

---

## Running the Application

Because the Express API proxy (`src/server.ts`) is integrated with Angular 21's SSR dev middleware, a single command starts both the Angular frontend and the `/api/core/*` backend proxy on port `3000`:

### Development Server (Frontend + Express API Proxy)

```bash
# Optional: load .env into your shell session before starting
set -a && source .env && set +a
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build & Server

```bash
npm run build
set -a && source .env && set +a
npm run serve:ssr:app
```

By default, the production Node/Express server listens on `PORT` (`4000` if unset).

---

## Running Tests & Linting

```bash
# Run all frontend & backend Vitest unit/integration tests
npm test -- --watch=false

# Run ESLint (TypeScript + Angular template accessibility checks)
npm run lint

# Verify full production TypeScript & AOT build
npm run build
```

---

## Example Boolean Searches

| Expression | Behavior |
| :--- | :--- |
| `drone` | Single keyword search across indexed works |
| `drone AND delivery` | Works matching both `drone` and `delivery` |
| `(drone AND (package OR delivery))` | Nested Boolean grouping combining `AND` with `OR` |
| `(artificial intelligence OR machine learning) AND healthcare` | Multi-term synonym expansion constrained by domain |
| `"federated learning" AND privacy` | Exact phrase combined with a required term |
| `title:robotics AND yearPublished>=2022` | Field-specific CORE search with publication year range |

---

## Known Limitations

- **Unauthenticated CORE Rate Limits**: Without `CORE_API_KEY`, CORE API v3 enforces a tight shared IP rate limit (typically 10 requests per 10 minutes) and responds with HTTP `429`. ResearchLens surfaces the exact `x-ratelimit-retry-after` timestamp and setup guidance when this occurs.
- **Chart Data Scope**: The publication-year bar chart aggregates only the papers retrieved in the active request (up to 100 works per request), not every record in `totalHits`. This scope—and any count of undated papers—is explicitly disclosed beneath the chart.
- **CORE Deep Pagination Cap**: CORE API v3 supports standard `offset` pagination up to 10,000 results per query.
- **Metadata Completeness**: Open-access records aggregated by CORE occasionally omit abstracts, DOIs, or publication dates. ResearchLens displays explicit fallbacks rather than fabricating values.

---

## Optional Features Implemented

- Persistent recent search history (`localStorage`) with one-click re-execution and clear history action.
- Clear search button and quick Boolean operator insertion helpers (`AND`, `OR`, `NOT`, `( )`).
- Result count summary showing exact retrieved range (`Showing 1–20 of N matching works`).
- One-click **Copy DOI** and **Copy URL** with visual confirmation feedback.
- Direct external links to source full-text / DOI / CORE work pages.
- Client-side sorting of retrieved papers by CORE relevance, newest publication year, or oldest publication year.
- Interactive click-on-bar year filtering linking the Chart.js graph to the paper list.
- RFC-4180 **Export CSV** download of retrieved papers.
- Debounced Boolean syntax inspection (`debounceTime(200)`) as the user types.
- URL query parameter synchronization (`?q=...&limit=...&offset=...`) for shareable searches.
- Accessibility enhancements (`role="search"`, `role="alert"`, `aria-live`, keyboard focus rings, `prefers-reduced-motion`, WCAG AA contrast).
- GitHub Actions CI workflow (`.github/workflows/ci.yml`).

---

## Recommended GitHub Commit Sequence

To initialize and publish this repository cleanly to GitHub:

```bash
git init
git branch -M main

# Stage 1: Project configuration, metadata, styles, and environment templates
git add angular.json package.json package-lock.json tsconfig*.json eslint.config.js .gitignore .env.example src/index.html src/styles.css
git commit -m "chore: initialize Angular 21 project structure and styling"

# Stage 2: Backend Express CORE API proxy and validation
git add src/server.ts src/server/
git commit -m "feat(api): add Express CORE API v3 proxy with input validation and rate-limit handling"

# Stage 3: Domain models, mappers, Boolean validator, and Angular CoreApi service
git add src/app/models/ src/app/utils/ src/app/services/ src/app/app.config.ts src/app/app.routes.ts
git commit -m "feat(core): implement CORE API service, Boolean validator, and response mappers"

# Stage 4: Search bar, paper cards, results list, and navbar
git add src/app/components/navbar/ src/app/components/search-bar/ src/app/components/paper-card/ src/app/components/results-list/ src/app/components/boolean-guide/
git commit -m "feat(ui): build Boolean search interface, result-limit controls, and paper cards"

# Stage 5: Publication-year Chart.js visualization and dashboard integration
git add src/app/components/publication-chart/ src/app/pages/dashboard/
git commit -m "feat(chart): add publication-year Chart.js visualization and interactive dashboard"

# Stage 6: Tests, CI workflow, and documentation
git add src/**/*.spec.ts .github/workflows/ci.yml README.md
git commit -m "test(docs): add frontend/backend unit tests, CI workflow, and README"

# Connect remote and push
git remote add origin https://github.com/<your-username>/researchlens.git
git push -u origin main
```
