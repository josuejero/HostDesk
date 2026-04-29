# HostDesk test matrix

## Test layers

| Layer | Command | Main evidence |
|---|---|---|
| Frontend unit/component | `npm run test` | React state, utilities, UI behavior |
| Frontend coverage | `npm run test:coverage` | Coverage report |
| API integration | `HOSTDESK_API_BASE_URL=http://127.0.0.1:8080 npm run test:api` | Authenticated PHP/MySQL behavior |
| Browser E2E | `npm run test:e2e` | Main user workflow in browser |

## API route coverage

| Method | Route | Auth required | CSRF required | API test coverage | E2E coverage | Notes |
|---|---|---:|---:|---:|---:|---|
| POST | `/api/auth/register` | No | No | Yes | Partial | Creates demo workspace |
| POST | `/api/auth/login` | No | No | Add | Yes/partial | Should test valid and invalid login |
| POST | `/api/auth/logout` | Yes | Yes | Yes | Add | Should reject missing CSRF |
| GET | `/api/auth/session` | No | No | Add | Add | Should show unauthenticated/authenticated state |
| GET | `/api/health` | No | No | CI curl | No | Used by CI health check |
| GET | `/api/prospects` | Yes | No | Yes | Yes/partial | Main list view |
| GET | `/api/prospects/:id` | Yes | No | Add | Yes/partial | Detail view |
| POST | `/api/prospects/:id/notes` | Yes | Yes | Yes | Add | Tests persistence and CSRF rejection |
| POST | `/api/prospects/:id/activities` | Yes | Yes | Add | Add | Should test metrics impact |
| POST | `/api/prospects/:id/cadence-tasks` | Yes | Yes | Add | Add | Should test task creation |
| PATCH | `/api/cadence-tasks/:id` | Yes | Yes | Add | Add | Should test completion/skipping |
| POST | `/api/prospects/:id/stage-transitions` | Yes | Yes | Yes | Add | Tests blocked and valid transition |
| PATCH | `/api/prospects/:id/review` | Yes | Yes | Add | Add | Should test review fields |
| PATCH | `/api/prospects/:id/ownership` | Yes | Yes | Yes | Add | Tests owner/persona/due date update |
| PATCH | `/api/prospects/:id/ai-fields` | Yes | Yes | Add | Add | Should test generated fields edit |
| POST | `/api/demo/reset` | Yes | Yes | Yes | Add | Should restore seeded state |
| GET | `/api/metrics` | Yes | No | Yes | Add | Should test range fallback and dashboard values |

## Next test improvements

- Invalid login returns the expected error and does not authenticate.
- `GET /api/auth/session` returns unauthenticated before login and authenticated after login.
- `GET /api/prospects/:id` rejects another user's prospect ID.
- Activity and cadence-task mutations persist records and update relevant metrics.
- Browser E2E covers note persistence, blocked stage transitions, ownership updates, and the metrics dashboard.
- Frontend tests cover metrics empty/loading/error states, invalid prospect routes, optional scorecard fields, interval cleanup, and required form validation.
