# HostDesk project metrics

Last updated: 2026-04-29

## Scope metrics

| Area | Metric | Value | Evidence |
|---|---:|---:|---|
| API | Route entries | 17 | `api/src/routes/*.php` |
| Database | Tables | 7 | `api/database/schema.sql` |
| Database | Indexes | 10 | `api/database/schema.sql` |
| Database | Foreign keys | 7 | `api/database/schema.sql` |
| Frontend | React component files | 18 | `src/app/components` |
| Seed data | Prospect scenarios | 9 | `data/scenario-catalog.json` |
| Seed data | KB articles | 8 | `data/kb-articles.json` |
| Seed data | Canned replies | 7 | `data/canned-replies.json` |
| Tests | Test declarations | 20 | `src/**/*.test.*`, `tests/**/*.test.*`, `tests/e2e/*.e2e.ts` |
| CI | Workflow files | 5 | `.github/workflows` |

## Quality snapshot

| Metric | Latest value | Target | Evidence |
|---|---|---|---|
| Lint | Passing locally | Passing | GitHub Actions |
| TypeScript build | Passing locally | Passing | GitHub Actions |
| Unit/component tests | 20 passed, 2 API tests skipped without API base URL | Passing | Vitest report |
| API integration tests | TBD locally; Docker daemon unavailable | Passing | Vitest API report |
| E2E tests | TBD locally; Docker daemon unavailable | Passing | Playwright report |
| Statement coverage | 70.94% | Baseline first, then improve | Coverage report |
| Branch coverage | 61.76% | Baseline first, then improve | Coverage report |
| Function coverage | 71.29% | Baseline first, then improve | Coverage report |
| Line coverage | 71.36% | Baseline first, then improve | Coverage report |
| Lighthouse Performance | 100 | 90+ | Lighthouse report |
| Lighthouse Accessibility | 100 | 90+ | Lighthouse report |
| Lighthouse Best Practices | 96 | 90+ | Lighthouse report |
| Largest Contentful Paint | 1.66s | <= 2.5s | Lighthouse report |
| Cumulative Layout Shift | 0 | <= 0.1 | Lighthouse report |
| Total Blocking Time | 0ms | <= 200ms | Lighthouse report |
| Critical/high npm vulnerabilities | 0 critical / 4 high | 0 | npm audit / Dependabot |
| Code scanning alerts | TBD | 0 critical/high | GitHub code scanning |

## Security and dependency evidence

| Metric | Latest value | Target | Evidence |
|---|---|---|---|
| npm critical vulnerabilities | 0 | 0 | `metrics/reports/npm-audit.json` |
| npm high vulnerabilities | 4 | 0 | `metrics/reports/npm-audit.json` |
| npm moderate vulnerabilities | 4 | Baseline first, then reduce | `metrics/reports/npm-audit.json` |
| Dependabot open alerts | Pending after GitHub push | Triage weekly | GitHub Security tab |
| CodeQL open alerts | Pending after GitHub push | 0 critical/high | GitHub CodeQL |
| OpenSSF Scorecard | Pending after GitHub push | Baseline first, then improve | Scorecard workflow artifact |

## Local validation notes

- Static scope metrics are regenerated with `npm run metrics:static`.
- Generated HTML reports are ignored locally and uploaded as CI artifacts.
- Docker-backed API and E2E validation require Docker Desktop or another running Docker daemon.
- The 2026-04-29 local run could not execute Docker-backed checks because the Docker daemon was unavailable.
