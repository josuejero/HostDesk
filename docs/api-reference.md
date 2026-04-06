# HostDesk API Reference

This document describes the current PHP API under `/api`.

## Conventions

### Base Path

All routes are rooted at `/api`.

### Response Envelope

Every route returns JSON in one of two shapes:

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Something went wrong.",
    "fieldErrors": {
      "fieldName": "Message"
    }
  }
}
```

### Authentication Model

- Authentication uses PHP sessions stored in cookies.
- Authenticated browser requests send `credentials: 'same-origin'`.
- Login and registration return a session payload that includes a CSRF token.
- Authenticated write requests must include `X-CSRF-Token`.

Routes that require an authenticated user will return `401` when there is no active session.

### CSRF Requirements

CSRF is required on authenticated non-GET mutations:

- `POST /api/auth/logout`
- all prospect mutation routes
- `POST /api/demo/reset`

Registration and login do not require an existing CSRF token.

## Session Payload

Successful auth routes return a `SessionState` payload:

```json
{
  "authenticated": true,
  "user": {
    "id": "1",
    "email": "user@example.com",
    "displayName": "HostDesk User",
    "createdAt": "2026-04-06T12:00:00+00:00",
    "lastLoginAt": "2026-04-06T12:00:00+00:00"
  },
  "csrfToken": "token"
}
```

If the user is signed out:

```json
{
  "authenticated": false,
  "user": null,
  "csrfToken": null
}
```

## Health

### `GET /api/health`

Returns a small health payload and checks database connectivity with `SELECT 1`.

Example:

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-04-06T12:00:00+00:00"
}
```

## Auth Routes

### `POST /api/auth/register`

Creates a user, seeds that user's workspace from the scenario catalog, logs the user in, and returns the session payload.

Request body:

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "displayName": "HostDesk User"
}
```

Validation rules:

- `email` must be a valid email address
- `password` must be at least 8 characters
- `displayName` is required

Important behavior:

- duplicate emails return `409 email_taken`
- registration seeds the user's prospects immediately

### `POST /api/auth/login`

Authenticates an existing user and returns the session payload.

Request body:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Important behavior:

- blank email or password returns `422 validation_failed`
- after 5 recent failures within the last 15 minutes for the same email or IP, the route returns `429 login_locked`
- successful login clears recent failures for that email and IP

### `POST /api/auth/logout`

Requires an authenticated session and a CSRF header. Logs the user out and returns an unauthenticated session payload.

### `GET /api/auth/session`

Returns the current session state. This is the first route the frontend calls on load.

## Prospect Routes

### `GET /api/prospects`

Returns the signed-in user's prospect summaries:

```json
{
  "prospects": [
    {
      "id": "12",
      "externalKey": "lead-avd-cost-control",
      "subject": "...",
      "company": "...",
      "stage": "Active"
    }
  ]
}
```

### `GET /api/prospects/:id`

Returns a prospect detail payload with nested:

- `activities`
- `notes`
- `cadenceTasks`
- `stageHistory`

### `POST /api/prospects/:id/notes`

Adds an internal note and also logs a `note-added` activity.

Request body:

```json
{
  "body": "Captured additional context.",
  "nextStep": "Schedule follow-up.",
  "outcome": "Captured",
  "playbookId": "playbook-avd-cost-control"
}
```

Notes:

- `body` is required
- `nextStep`, when present, also updates `recommendedNextAction`
- `playbookId`, when present, is appended to `playbookMatches` if it is not already there

### `POST /api/prospects/:id/activities`

Adds a timeline activity and may update other fields.

Request body:

```json
{
  "type": "outbound-email",
  "summary": "Sent a follow-up.",
  "outcome": "Delivered",
  "nextStep": "Call on Thursday.",
  "nextTouchDueAt": "2026-04-08T14:00:00.000Z",
  "crmUpdated": true
}
```

Supported activity types:

- `outbound-email`
- `call-attempt`
- `linkedin-touch`
- `reply-received`
- `meeting-booked`
- `enrichment-update`
- `ownership-changed`
- `note-added`
- `ai-draft-used`

Important behavior:

- `summary` is required
- channel is inferred from `type`
- some activity types update `last_touch_at`
- `nextTouchDueAt`, when present, updates the prospect
- `nextStep`, when present, updates `recommended_next_action`
- CRM completeness is recomputed

### `POST /api/prospects/:id/cadence-tasks`

Creates a saved cadence task.

Request body:

```json
{
  "stepName": "Follow up on pricing question",
  "channel": "email",
  "dueAt": "2026-04-09T15:00:00.000Z"
}
```

Important behavior:

- all three fields are required
- after creation, the prospect's `next_touch_due_at` is set to the earliest open cadence task
- CRM completeness is recomputed

### `PATCH /api/cadence-tasks/:id`

Updates an existing cadence task.

Supported fields:

- `status`: `open`, `completed`, or `skipped`
- `completedAt`
- `dueAt`

Important behavior:

- changing status to `completed` sets `completed_at` if needed
- after update, the parent prospect's `next_touch_due_at` is recalculated from the earliest open task
- CRM completeness is recomputed

### `POST /api/prospects/:id/stage-transitions`

Attempts to move a record into a new stage.

Request body:

```json
{
  "toStage": "Handoff ready"
}
```

Allowed stages:

- `New lead`
- `Active`
- `Meeting booked`
- `Handoff ready`
- `Nurture`
- `Disqualified`

On success, the API:

- updates `stage`
- updates `stage_entered_at`
- inserts a stage history row
- inserts a `stage-changed` activity
- recomputes CRM completeness

On failure, the API returns `422 stage_gate_failed`.

### `PATCH /api/prospects/:id/review`

Patches CRM hygiene review fields.

Supported fields:

- `deduplication`
- `stageCriteria`
- `nextStepPlan`
- `handoffNotes`
- `playbookStatus`

### `PATCH /api/prospects/:id/ownership`

Patches operational ownership fields.

Supported fields:

- `owner`
- `buyerPersona`
- `nextTouchDueAt`
- `disqualificationReason`

Important behavior:

- owner changes automatically insert an `ownership-changed` activity
- CRM completeness is recomputed

### `PATCH /api/prospects/:id/ai-fields`

Applies deterministic AI-generated content to the saved record.

Request body:

```json
{
  "kind": "next-step",
  "body": "Send a follow-up tied to the current migration blockers."
}
```

Supported `kind` values:

- `summary`
- `next-step`
- `draft`

Important behavior:

- `summary` updates `ai_summary`
- `next-step` updates `recommended_next_action`
- `draft` does not modify core prospect fields
- all three variants log an `ai-draft-used` activity

## Metrics And Demo Routes

### `GET /api/metrics?range=7d|30d`

Returns a saved metrics snapshot for the current user.

Fields:

- `range`
- `responseRatePct`
- `stageConversions`
- `overdueFollowups`
- `tasksDueToday`
- `meetingsBooked`
- `overdueItems`

Metric definitions come from SQL queries in `MetricsRepository.php`.

### `POST /api/demo/reset`

Deletes the current user's prospects and reseeds them from `data/scenario-catalog.json`.

Response:

```json
{
  "records": []
}
```

The returned `records` array contains fresh prospect summaries for the reset workspace.

## Stage Gate Rules

Stage transitions are rejected unless these conditions are met:

### `Meeting booked`

Requires:

- at least one outbound activity
- at least one `reply-received` or `meeting-booked` activity

### `Handoff ready`

Requires:

- owner
- buyer persona
- last touch date
- dated next step
- a non-mixed Microsoft motion inference

### `Disqualified`

Requires:

- `disqualificationReason`

### `Active`

Requires:

- non-stale record
- dated next step

The frontend checks these rules optimistically, and the backend enforces them authoritatively.

## Common Error Codes

Observed error codes in the current implementation:

- `validation_failed`
- `email_taken`
- `login_locked`
- `invalid_credentials`
- `auth_required`
- `prospect_not_found`
- `cadence_task_not_found`
- `stage_gate_failed`
- `route_invalid`
- `db_connection_failed`
- `not_found`
- `server_error`

## UI Coverage Note

The cadence task endpoints are real backend surface, but the current UI only exposes cadence task data indirectly:

- through seeded next-touch dates
- through metrics calculations
- through overdue item display

There is not yet a dedicated create or edit cadence task screen in the React app.
