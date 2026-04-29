# Development Workflow

This guide covers local setup, commands, test layers, and contributor-facing runtime details.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop or compatible Docker engine
- A machine with ports `3306`, `5173`, and `8080` available

You do not need Composer for the current backend. The PHP API is plain PHP loaded through `require_once`, and the Docker image installs `pdo_mysql`.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` if you need local overrides.

3. Start MySQL and the API:

   ```bash
   npm run docker:up
   ```

4. Start the frontend:

   ```bash
   npm run dev
   ```

5. Open `http://127.0.0.1:5173`.

## Default Local Runtime

When the standard local stack is running:

- MySQL listens on `127.0.0.1:3306`
- the PHP API listens on `127.0.0.1:8080`
- the Vite dev server listens on `127.0.0.1:5173`

Vite proxies `/api` to the backend using `VITE_API_PROXY_TARGET`.

## Common Commands

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run php:lint
npm run data:validate
```

### Tests

```bash
npm run test
npm run test:api
npm run test:e2e
```

### Docker Helpers

```bash
npm run docker:up
npm run docker:down
npm run docker:logs
```

## Test Strategy

HostDesk uses three different test layers.

### `npm run test`

Runs Vitest against:

- frontend utilities
- component-level integration
- `DeskApp` behavior

These tests use the mock API in [`src/tests/mockApi.ts`](../src/tests/mockApi.ts), so they do not require the PHP server or MySQL.

### `npm run test:api`

Runs real API integration tests from [`tests/api/hostdesk-api.test.ts`](../tests/api/hostdesk-api.test.ts).

These tests require:

- Docker Compose services to be running
- `HOSTDESK_API_BASE_URL` to point at the API, usually `http://127.0.0.1:8080`

They verify:

- registration and login flow
- stage-gate enforcement
- notes persistence
- metrics reads
- demo reset
- logout

### `npm run test:e2e`

Runs Playwright against the full browser app.

The end-to-end test currently covers:

- registration
- scenario library navigation
- AI draft generation and application
- activity logging
- persistence across reload
- stage transition
- metrics screen
- logout

If Playwright browsers are missing locally:

```bash
npx playwright install
```

## Environment Variables

Current variables from `.env.example`:

| Variable | Purpose |
| --- | --- |
| `APP_ENV` | Backend environment label |
| `APP_DEBUG` | Show backend errors in development when set to `1` |
| `APP_TIMEZONE` | Backend timezone |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port |
| `DB_NAME` | MySQL database name |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `SESSION_NAME` | PHP session cookie name |
| `SESSION_COOKIE_SECURE` | Secure cookie toggle |
| `SESSION_COOKIE_SAMESITE` | SameSite cookie policy |
| `VITE_BASE_PATH` | Frontend build base path |
| `VITE_API_PROXY_TARGET` | Local dev API proxy target |
| `HOSTDESK_API_BASE_URL` | Base URL for Node-side API tests |

## GitHub Actions

### CI

`.github/workflows/ci.yml` does the full validation pass:

1. `npm ci`
2. `npm run data:validate`
3. `docker compose up -d --build`
4. wait for `GET /api/health`
5. Docker-backed PHP syntax check
6. `npm run lint`
7. `npm run build`
8. `npm run test`
9. `npm run test:coverage`
10. `npm run test:api`
11. install Playwright browsers
12. `npm run test:e2e`

### Static Preview Deployment

`.github/workflows/deploy.yml` publishes the static Vite preview to GitHub Pages:

1. `npm ci`
2. `npm run build` with `VITE_BASE_PATH=/HostDesk/`
3. upload `dist/` with `actions/upload-pages-artifact`
4. deploy the artifact with `actions/deploy-pages`

This workflow deploys only the static frontend preview. It does not provision the PHP/MySQL API runtime, so the full authenticated app still requires Docker Compose locally or a separate API host mounted at `/api`.

## Working With The Seed Data

The seed catalog is defined in [`data/scenario-catalog.json`](../data/scenario-catalog.json).

Important behaviors:

- registering a user seeds a fresh private workspace
- `POST /api/demo/reset` reseeds the current user from the same catalog
- seeded scenarios become persisted records in MySQL
- seeded next-touch dates also create open cadence tasks

If you change the scenario catalog, you should usually also review:

- [`docs/scenario-catalog.mdx`](./scenario-catalog.mdx)
- API tests that rely on known external keys such as `lead-citrix-research`
- Playwright flows that assume specific seeded data exists

## Troubleshooting

### Frontend loads but every API request fails

Check:

- `npm run docker:up` is running
- `http://127.0.0.1:8080/api/health` responds
- `VITE_API_PROXY_TARGET` matches the backend URL

### Database connection errors

Check:

- Docker is running
- MySQL container is healthy
- your local port `3306` is not already occupied
- `.env` values match the running database

### Session behavior works locally but not on a deployed frontend

That usually means the frontend is not sharing an origin with the API. The browser client uses cookie-based auth and relative `/api` paths, so a static-only host without a same-origin API will not behave like local development.

### Playwright fails before tests start

Install browsers locally:

```bash
npx playwright install
```
