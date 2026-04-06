# HostDesk Architecture

This document explains how HostDesk is wired today so the codebase, runtime model, and docs stay aligned.

## Runtime Topology

HostDesk runs as a small full-stack app:

- The React frontend is served by Vite in development.
- The PHP API is served with `php -S` from `api/public/router.php`.
- MySQL stores users, prospects, notes, activities, cadence tasks, and stage history.
- In local development, Vite proxies `/api` to `http://127.0.0.1:8080`.
- Outside development, the frontend expects `/api` on the same origin.

The Docker Compose stack starts two services:

- `mysql`: MySQL 8 with the schema mounted from `api/database/init/01-schema.sql`
- `api`: PHP 8.3 CLI with `pdo_mysql` installed and the repo mounted into `/app`

## Frontend Architecture

The frontend entry point is [`src/App.tsx`](../src/App.tsx).

### Session Flow

- `useSession()` in `src/api/hooks.ts` calls `GET /api/auth/session` on load.
- If the session is unauthenticated, `AuthShell` renders login and registration forms.
- On registration, the backend creates the user and seeds a personal workspace from `data/scenario-catalog.json`.
- On success, the app switches into the authenticated desk UI.

### Main Workspace

`DeskApp` is the top-level authenticated surface. It owns:

- `activeSurface`: workspace vs metrics
- `metricsRange`: `7d` or `30d`
- long-lived UI preferences stored through `useLocalStorageState`

`useDeskState()` is the main orchestration hook. It coordinates:

- prospect list fetches
- prospect detail fetches
- queue filtering and search
- scenario library navigation
- activity logging
- ownership and review patching
- stage transitions
- deterministic AI suggestion generation and application
- demo reset

### Local Vs Persisted State

Persisted state lives in MySQL and is fetched through the API:

- session
- prospect summaries
- prospect detail
- notes
- activity timeline
- stage history
- cadence tasks
- metrics

Local storage is used only for UI preferences:

- selected queue view
- selected record
- active surface

Transient in-memory state holds draft text, selected reply template, pending AI suggestions, toasts, and overlay toggles.

### Data Assets Used By The Frontend

The frontend imports these static JSON assets from `data/`:

- `scenario-catalog.json`: seeded scenarios and scenario metadata
- `kb-articles.json`: playbook articles used for suggestions and guided research
- `canned-replies.json`: editable outreach templates
- `scoring-rubric.json`: rubric metadata used by the scorecard panels

The TypeScript loader is [`src/data/index.ts`](../src/data/index.ts).

### Routing, Queueing, And Scoring Logic

Important frontend-only business helpers live in `src/app/utils/`:

- `routing.ts`: queue buckets, stage gates, Microsoft motion inference, urgency, channel guidance, data hygiene
- `scorecard.ts`: operational scorecard assembly
- `timer.ts`: countdown labels and follow-up status
- `aiAssist.ts`: deterministic AI suggestion generation
- `postmortem.ts`: CRM hygiene review fields and labels

The same stage-gate rules are duplicated in the backend so the browser cannot bypass them with direct API calls.

## Backend Architecture

The PHP API is intentionally small and file-based.

### Bootstrap And Routing

- `api/public/router.php` handles PHP's built-in server routing.
- `api/public/index.php` loads routes and dispatches by method and regex pattern.
- `api/src/bootstrap.php` loads `.env`, configures sessions, builds PDO, and instantiates repositories and services.

### Service Layer

- `AuthService.php`: registration, login, logout, session payload generation
- `ProspectService.php`: all prospect mutations, metrics requests, and demo reset
- `StageRulesService.php`: stage-gate logic and Microsoft motion inference
- `ProspectSeederService.php`: copies static scenario data into MySQL per user

### Repository Layer

- `UserRepository.php`: user lookup and creation
- `LoginAttemptRepository.php`: rate-limit support for login failures
- `ProspectRepository.php`: prospect reads and writes plus nested collections
- `MetricsRepository.php`: SQL-backed metric snapshots

## Persistence Model

The MySQL schema lives in [`api/database/schema.sql`](../api/database/schema.sql).

Core tables:

- `users`: registered users and login metadata
- `login_attempts`: failed login tracking for short-term lockout
- `prospects`: the main saved pipeline record
- `prospect_activities`: timeline entries
- `prospect_notes`: internal notes
- `cadence_tasks`: saved follow-up tasks
- `prospect_stage_history`: stage transition audit trail

### Important Persistence Details

- Scenario `record.id` values become `prospects.external_key`.
- JSON-like record arrays are stored as MySQL JSON columns.
- A stage history entry is inserted when a user is seeded and whenever a stage transition succeeds.
- If a seeded scenario has `nextTouchDueAt`, the seeder also creates an open cadence task.
- CRM completeness is recomputed after the ownership, activity, cadence, and stage flows that can change it.

## Mutation Flows

### Registration

1. User submits email, password, and display name.
2. `AuthService::register()` validates the payload.
3. A new user is inserted.
4. `ProspectSeederService::resetForUser()` seeds that user's workspace.
5. The user is logged in and receives a CSRF token.

### Activity Logging

1. The composer posts to `POST /api/prospects/:id/activities`.
2. The service validates the activity type and summary.
3. A timeline entry is inserted.
4. `last_touch_at`, `next_touch_due_at`, and `recommended_next_action` are updated when appropriate.
5. CRM completeness is recomputed.

### Ownership And Review Patching

Ownership and review fields autosave with a short debounce in `useDeskState()`:

- review patch delay: 450ms
- ownership patch delay: 450ms

The browser updates local state optimistically, then persists changes with:

- `PATCH /api/prospects/:id/review`
- `PATCH /api/prospects/:id/ownership`

### Stage Transitions

1. The UI checks stage gates with `canMoveToStage()`.
2. The API rechecks the same rules in `StageRulesService`.
3. On success, the prospect stage and `stage_entered_at` are updated.
4. A stage history row is inserted.
5. A `stage-changed` activity is inserted.

### AI Suggestion Application

AI suggestions are generated in-browser from existing record data. Applying a suggestion:

- may update `ai_summary`
- may update `recommended_next_action`
- always logs an `ai-draft-used` activity

There is no external model call in the current implementation.

## Metrics Model

The metrics dashboard reads from persisted MySQL data, not local browser state.

`MetricsRepository` currently calculates:

- response rate
- stage conversions
- overdue follow-ups
- tasks due today
- meetings booked
- the top 25 overdue follow-up items

Because metrics read saved activity and task data, they survive reloads and new sessions.

## UI Coverage Vs API Coverage

One of the easiest places for docs to drift was cadence tasks, so it is called out explicitly here:

- the API supports creating and updating cadence tasks
- seeded data creates open cadence tasks when a scenario has a next-touch date
- metrics use cadence task data
- the current UI does not expose a dedicated task editor yet

That means cadence tasks are real persisted domain data, but not yet a fully surfaced frontend workflow.
