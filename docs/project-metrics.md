# HostDesk project metrics

Last updated: 2026-04-29

## Scope metrics

| Area | Metric | Value | Evidence |
|---|---:|---:|---|
| API | Route entries | 17 | `api/src/routes/*.php` |
| Database | Tables | 7 | `api/database/schema.sql` |
| Database | Indexes | 10 | `api/database/schema.sql` |
| Database | Foreign keys | 7 | `api/database/schema.sql` |
| Frontend | React component files | 19 | `src/app/components` |
| Seed data | Prospect scenarios | 9 | `data/scenario-catalog.json` |
| Seed data | KB articles | 8 | `data/kb-articles.json` |
| Seed data | Canned replies | 7 | `data/canned-replies.json` |
| Tests | Test declarations | 32 | 20 frontend, 10 API, 2 E2E |
| CI | Workflow files | 5 | `.github/workflows` |

## Quality snapshot

| Metric | Latest value | Target | Evidence |
|---|---|---|---|
| Lint | Passing locally | Passing | GitHub Actions |
| TypeScript build | Passing locally | Passing | GitHub Actions |
| Frontend tests | 20 passed | Passing | Vitest report |
| API integration tests | 10 Docker-backed behavior tests | Passing | Vitest API report |
| E2E tests | 2 primary workflows covered | Passing | Playwright report |
| Seed data validation | Scenario catalog, KB articles, canned replies, and scoring rubric validated against JSON schemas | Passing | `npm run data:validate` |
| PHP syntax check | 21 PHP files checked | Passing | `npm run php:lint` |
| Statement coverage | 70.94% | Baseline first, then improve | Coverage report |
| Branch coverage | 61.76% | Baseline first, then improve | Coverage report |
| Function coverage | 71.29% | Baseline first, then improve | Coverage report |
| Line coverage | 71.36% | Baseline first, then improve | Coverage report |
| Static frontend Lighthouse Performance | 100 | 90+ | Lighthouse report |
| Static frontend Lighthouse Accessibility | 100 | 90+ | Lighthouse report |
| Static frontend Lighthouse Best Practices | 96 | 90+ | Lighthouse report |
| Largest Contentful Paint | 1.66s | <= 2.5s | Lighthouse report |
| Cumulative Layout Shift | 0 | <= 0.1 | Lighthouse report |
| Total Blocking Time | 0ms | <= 200ms | Lighthouse report |
| Runtime dependency audit | 0 high/critical vulnerabilities | 0 | `npm run audit:prod` |
| Full dependency audit | 0 high/critical vulnerabilities; 2 moderate dev-tooling findings under review | 0 high runtime risk | `metrics/reports/npm-audit.json` |
| Code scanning alerts | TBD | 0 critical/high | GitHub code scanning |

## Route coverage snapshot

| Coverage area | Current value |
|---|---:|
| API routes listed in matrix | 17 / 17 |
| API routes directly exercised by integration tests | 16 / 17 |
| State-changing routes with CSRF rejection coverage | 10 / 10 |
| Primary E2E workflows covered | 2 |

## Security and dependency evidence

| Metric | Latest value | Target | Evidence |
|---|---|---|---|
| Runtime npm high/critical vulnerabilities | 0 | 0 | `npm run audit:prod` |
| Full npm critical vulnerabilities | 0 | 0 | `metrics/reports/npm-audit.json` |
| Full npm high vulnerabilities | 0 | 0 high/critical | `metrics/reports/npm-audit.json` |
| Full npm moderate vulnerabilities | 2 dev-tooling findings under review | Baseline first, then reduce | `metrics/reports/npm-audit.json` |
| Dependabot open alerts | Pending after GitHub push | Triage weekly | GitHub Security tab |
| CodeQL open alerts | Pending after GitHub push | 0 critical/high | GitHub CodeQL |
| OpenSSF Scorecard | Pending after GitHub push | Baseline first, then improve | Scorecard workflow artifact |

## Local validation notes

- Static scope metrics are regenerated with `npm run metrics:static`.
- Report-backed metrics are merged into `metrics/latest.json` with `npm run metrics:reports`.
- The full `npm run metrics:all` routine regenerates static metrics, coverage, npm audit reports, the production build, and Lighthouse before parsing report-backed values.
- Generated HTML reports are ignored locally and uploaded as CI artifacts.
- Docker-backed API and E2E validation require Docker Desktop or another running Docker daemon.
- Lighthouse values are a static frontend preview baseline, not full PHP/MySQL application performance.
