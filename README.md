# HostDesk

HostDesk is a recruiter-facing Microsoft cloud sales-operations simulator built in React/TypeScript with Vite, JSON seeds, and localStorage. It models queue-based prospect research, follow-up cadence, playbook suggestions, outreach templates, AI-assisted drafting, stage gating, and CRM hygiene review for Azure Virtual Desktop, Windows 365, and Intune motions.

The product story is intentionally static and free to host: a deterministic, browser-only portfolio app that feels like a real SDR / sales-ops console without requiring a backend or paid AI API.

## Live demo (GitHub Pages)
`https://josuejero.github.io/HostDesk/`

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
- **Testing + static deployment:** Vitest, Testing Library, Playwright, GitHub Actions, and GitHub Pages keep the project fully static and recruiter-friendly.

## Architecture overview
- `data/scenario-catalog.json`, `data/kb-articles.json`, `data/canned-replies.json`, and `data/scoring-rubric.json` provide the synthetic scenario catalog, playbooks, outreach templates, and SDR-ops rubric.
- `useLocalStorageState` persists a self-contained demo state in the browser so recruiters can replay workflows without a backend.
- `useDeskState` is the orchestration layer for queue slices, activity logging, stage gating, playbook matching, scorecards, and AI suggestions.
- Routing logic scores ICP fit, Microsoft relevance, urgency, recommended channel, handoff status, and data-hygiene risk from the current record state.
- Vite/TypeScript handles bundling, and GitHub Actions builds and deploys the static app to `gh-pages`.

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

## Getting started
```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run lint
npm test
npm run test:e2e
```

If Playwright browsers are not installed locally yet, run:

```bash
npx playwright install
```

GitHub Pages deployment is handled by `npm run build`, `npm run deploy`, and the workflow in `.github/workflows/deploy.yml`.
