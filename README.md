# HostDesk

HostDesk is a recruiter-facing Microsoft cloud sales-operations simulator built with React/TypeScript on the frontend and a small PHP/MySQL JSON API on the backend. It models queue-based prospect research, follow-up cadence, playbook suggestions, outreach templates, AI-assisted drafting, stage gating, CRM hygiene review, persisted notes, cadence tasks, and stage history for Azure Virtual Desktop, Windows 365, and Intune motions.

The UI is still scenario-driven and deterministic for portfolio storytelling, but canonical user data now lives in MySQL instead of `localStorage`.

## Screenshots
| Overview | Workspace |
| --- | --- |
| ![HostDesk hero snapshot](public/images/hero-screenshot.svg) | ![HostDesk workspace snapshot](public/images/ticket-screenshot.svg) |

## Feature list
- **Sales-ops queue slices:** New leads, needs-first-touch, due-today, stale, research-needed, meeting-booked, handoff-ready, and nurture/disqualified views.
- **Microsoft-cloud scenarios:** Seeded account motions for AVD cost optimization, Windows 365 contractor/BYOD rollout, Intune compliance, Citrix migration, MSP multi-tenant management, healthcare shared desktops, and education lab access.
- **Activity timeline:** Typed CRM activity tracking for outbound email, calls, LinkedIn touches, replies, meetings, enrichment, stage changes, AI usage, and notes.
- **Playbooks + guided research:** Keyword-driven playbook suggestions and guided account research surface the right motion when a prospect mentions Citrix, Cloud PCs, BYOD, compliance, MSP operations, or Azure cost pressure.
- **AI Assist (`mock` mode):** Deterministic account summaries, next-best-action suggestions, and follow-up drafts generated in-browser from the record, activity history, and matched playbooks.
- **Stage discipline:** Meeting-booked, handoff-ready, and disqualified stages enforce operational rules instead of allowing soft-progress records to drift through the pipeline.
- **Auth + persistence:** PHP sessions handle auth state, MySQL/InnoDB stores prospects and operational history, and new users get seeded portfolio scenarios automatically.
- **Metrics page:** Response rate, stage conversions, overdue follow-ups, due-today tasks, and meetings booked now come from SQL-backed API queries.

## Architecture overview
- `data/scenario-catalog.json`, `data/kb-articles.json`, `data/canned-replies.json`, and `data/scoring-rubric.json` provide the synthetic scenario catalog, playbooks, outreach templates, and SDR-ops rubric.
- `api/` contains the PHP 8 JSON API, PDO repositories, session/CSRF handling, MySQL schema, and scenario seeding services.
- `useDeskState` remains the frontend orchestration layer, but now coordinates fetch-based record loading and server-backed mutations instead of browser-only persistence.
- `useLocalStorageState` is limited to harmless UI preferences such as active panels and queue view selection.
- Routing logic scores ICP fit, Microsoft relevance, urgency, recommended channel, handoff status, and data-hygiene risk from the current record state.
- Vite/TypeScript handles bundling, proxies `/api` in local development, and the Docker Compose stack provides PHP 8.3 + MySQL 8 for local work.

## Scenario catalog
HostDesk ships with 9 seeded scenarios in `data/scenario-catalog.json`. The first three are the primary portfolio demos:

1. MSP evaluating AVD cost control
2. Contractor fleet for Windows 365
3. Intune compliance rollout

Additional scenarios cover stale records, nurture, research cleanup, meeting-booked progression, handoff-ready packaging, and disqualification hygiene. See `docs/scenario-catalog.mdx` for the breakdown.

## Why this is a strong portfolio project
This repo demonstrates more than React UI polish:

- queue slicing and operational prioritization
- deterministic AI-assist UX without backend dependencies
- enforceable stage gates and CRM hygiene rules
- scenario-driven workflow design across Microsoft cloud motions
- testable local persistence and GitHub Pages deployment

It is intentionally inspired by real Microsoft cloud sales/ops workflows, but it is not affiliated with Nerdio or any Microsoft product team.

## Local setup
Copy `.env.example` to `.env` if you need custom local values.

Start the backend dependencies:

```bash
npm run docker:up
```

Start the frontend dev server in another terminal:

```bash
npm install
npm run dev
```

The Vite app runs on `http://127.0.0.1:5173` by default and proxies `/api` to the PHP service on `http://127.0.0.1:8080`.

Quality gates:

```bash
npm run lint
npm test
npm run test:api
npm run test:e2e
```

If Playwright browsers are not installed locally yet, run:

```bash
npx playwright install
```

## Backend endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
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

Production deployment now targets a same-origin host that can serve both the React bundle and the PHP API, rather than GitHub Pages.
