# HostDesk

HostDesk is a full-stack SaaS-style workflow simulator for researching, qualifying, routing, and following up with cloud sales prospects. It uses a React/TypeScript frontend, PHP JSON API, MySQL persistence, session authentication, CSRF-protected mutations, Docker Compose orchestration, and automated tests across frontend, API, and end-to-end flows. This project demonstrates full-stack application development, REST-style APIs, SQL-backed workflows, authentication, data modeling, test automation, and local deployment.

The app models a saved pipeline instead of a browser-only demo. Users register or sign in, receive their own seeded workspace, and then work through queue slices, stage gates, notes, activity logging, guided research, canned outreach, deterministic AI assist, and metrics that are computed from persisted activity.

## Quick links
- **Live demo:** [GitHub Pages static frontend preview](https://josuejero.github.io/HostDesk/) for the built UI shell; use local Docker for the full API-backed demo
- **Screenshots:** [login](public/images/screenshots/login.svg), [queue](public/images/screenshots/prospect-queue.svg), [detail](public/images/screenshots/prospect-detail.svg), [activity flow](public/images/screenshots/notes-activity-flow.svg), [stage transition](public/images/screenshots/stage-transition.svg), [metrics](public/images/screenshots/metrics.svg), [test output](public/images/screenshots/test-output.svg)
- **Test report:** `npm run test`, `npm run test:api`, and `npm run test:e2e`
- **CI workflow:** `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- **Architecture docs:** `docs/architecture.md`, `docs/api-reference.md`, `docs/development.md`
- **Main code to inspect:** `src/`, `api/`, `tests/`, `data/scenario-catalog.json`

## Employer scan
**Best fit roles:** Junior Full-Stack Developer, Software Developer, Application Developer  
**Core stack:** React, TypeScript, PHP, MySQL, Docker Compose, Vitest, Playwright  
**What this proves:** Authenticated workflows, REST-style APIs, SQL persistence, CSRF protection, test automation, Docker-based local setup  
**Start here:** `src/`, `api/`, `tests/`, `docs/api-reference.md`

## Demo options
- **Fast scan:** open the screenshots below to review login, queue routing, prospect details, notes/activity logging, stage movement, metrics, and test coverage without running the app.
- **Full local demo:** run `npm install`, `npm run docker:up`, and `npm run dev`; click **Need an account?** and use the default local demo fields (`demo@hostdesk.local` / `Password123!`) to create a seeded account.
- **Seed/reset flow:** registration creates a personal copy of `data/scenario-catalog.json`; `POST /api/demo/reset` reseeds the current user's workspace.
- **Deployment note:** static hosting alone is not the full app because browser requests expect a same-origin `/api`, session cookies, and CSRF headers.

## Screenshot gallery
| Login | Prospect queue |
| --- | --- |
| ![HostDesk login screenshot](public/images/screenshots/login.svg) | ![HostDesk prospect queue screenshot](public/images/screenshots/prospect-queue.svg) |

| Prospect detail | Notes and activity flow |
| --- | --- |
| ![HostDesk prospect detail screenshot](public/images/screenshots/prospect-detail.svg) | ![HostDesk notes and activity flow screenshot](public/images/screenshots/notes-activity-flow.svg) |

| Stage transition | Metrics and test output |
| --- | --- |
| ![HostDesk stage transition screenshot](public/images/screenshots/stage-transition.svg) | ![HostDesk metrics screenshot](public/images/screenshots/metrics.svg) |

![HostDesk test output screenshot](public/images/screenshots/test-output.svg)

## Documentation Map

- [Architecture and runtime](docs/architecture.md)
- [API reference](docs/api-reference.md)
- [Development workflow](docs/development.md)
- [Scenario catalog](docs/scenario-catalog.mdx)

## What The Project Covers

- Authenticated workspace with PHP sessions and CSRF-protected mutations
- Per-user seeded demo data copied from `data/scenario-catalog.json`
- Queue slices for new leads, first touch, follow-up due, stale, research needed, meeting booked, handoff ready, and nurture or disqualified work
- Guided research and playbook suggestions driven by scenario metadata and keywords
- Deterministic AI assist that can apply summaries, next-best actions, and draft replies without calling an external LLM
- SQL-backed metrics for response rate, stage conversions, overdue follow-ups, tasks due today, and meetings booked
- Stage-gated pipeline motion enforced in both frontend helpers and backend services

## Stack Snapshot

- Frontend: React 19, TypeScript, Vite, ESLint, Vitest, Playwright
- Backend: PHP 8.3 CLI server, PDO, MySQL 8, session auth, CSRF tokens
- Test layers:
  - `npm run test` for frontend units and component-level integration with the mock API
  - `npm run test:api` for real PHP/MySQL integration tests
  - `npm run test:e2e` for Playwright end-to-end coverage
- Local orchestration: Docker Compose for MySQL and the PHP API

## Repo Layout

```text
HostDesk/
|- api/                   PHP API, routes, services, repositories, schema
|- data/                  Scenario catalog, playbooks, canned replies, scoring rubric, JSON schemas
|- docs/                  Project documentation
|- public/                Static assets
|- src/                   React app, hooks, components, styles, API client
|- tests/                 API and Playwright tests
|- .github/workflows/     CI and build workflows
|- docker-compose.yml     Local MySQL + PHP API stack
```

## Seeded Content

The repository ships with:

- 9 seeded scenarios
- 8 playbook articles
- 7 canned outreach templates
- 1 scoring rubric used by the sidebar scorecard

The source of truth for seeded records is [`data/scenario-catalog.json`](data/scenario-catalog.json). On registration and on `POST /api/demo/reset`, those scenarios are copied into MySQL for the current user. The original scenario `record.id` is stored in the database as `external_key`.

## Quick Start

### Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop or another Docker engine that supports Compose
- Open ports `3306`, `5173`, and `8080`

### Local Setup

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` if you need to override defaults.

3. Start MySQL and the PHP API:

   ```bash
   npm run docker:up
   ```

4. Start the frontend in a second terminal:

   ```bash
   npm run dev
   ```

### Local URLs

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8080`
- Health check: `http://127.0.0.1:8080/api/health`

In development, Vite proxies `/api` requests to the PHP server. In deployed environments, the frontend expects the API to be reachable at the same origin under `/api`.

## Environment Variables

These values are loaded from `.env` by the PHP bootstrap and partly reused by Vite and tests:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `APP_ENV` | API | Environment label |
| `APP_DEBUG` | API | Enables PHP error display when set to `1` |
| `APP_TIMEZONE` | API | Default timezone for backend date handling |
| `DB_HOST` | API | MySQL host |
| `DB_PORT` | API | MySQL port |
| `DB_NAME` | API | Database name |
| `DB_USER` | API | Database username |
| `DB_PASSWORD` | API | Database password |
| `SESSION_NAME` | API | PHP session cookie name |
| `SESSION_COOKIE_SECURE` | API | Secure cookie toggle |
| `SESSION_COOKIE_SAMESITE` | API | SameSite policy for the session cookie |
| `VITE_BASE_PATH` | Frontend build | Base path for the generated bundle |
| `VITE_API_PROXY_TARGET` | Vite dev server | Proxy target for `/api` during local development |
| `HOSTDESK_API_BASE_URL` | Node-side tests | Base URL for `npm run test:api` |

## Quality Gates

```bash
npm run lint
npm run test
npm run test:api
npm run test:e2e
```

If Playwright browsers are missing locally:

```bash
npx playwright install
```

Useful Docker helpers:

```bash
npm run docker:logs
npm run docker:down
```

## API Snapshot

Auth and session:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Prospects and mutations:

- `GET /api/prospects`
- `GET /api/prospects/:id`
- `POST /api/prospects/:id/notes`
- `POST /api/prospects/:id/activities`
- `POST /api/prospects/:id/cadence-tasks`
- `PATCH /api/cadence-tasks/:id`
- `POST /api/prospects/:id/stage-transitions`
- `PATCH /api/prospects/:id/review`
- `PATCH /api/prospects/:id/ownership`
- `PATCH /api/prospects/:id/ai-fields`
- `GET /api/metrics?range=7d|30d`
- `POST /api/demo/reset`

Every API response uses the same envelope:

- Success: `{ "ok": true, "data": ... }`
- Failure: `{ "ok": false, "error": { "code": "...", "message": "...", "fieldErrors": {} } }`

See [docs/api-reference.md](docs/api-reference.md) for payloads, stage-gate rules, CSRF behavior, and error codes.

## CI And Build Automation

- `.github/workflows/ci.yml` runs lint, frontend tests, real API tests, and Playwright against the Docker Compose stack.
- `.github/workflows/deploy.yml` currently validates that the frontend bundle builds with `npm run build`.

That second workflow is a build check, not a full deployment pipeline. The generated frontend bundle still needs an API host mounted at `/api` to work outside local development.
