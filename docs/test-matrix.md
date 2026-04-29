# HostDesk test matrix

## Test layers

| Layer | Command | Main evidence |
|---|---|---|
| Frontend unit/component | `npm run test` | React state, utilities, UI behavior |
| Frontend coverage | `npm run test:coverage` | Coverage report |
| API integration | `HOSTDESK_API_BASE_URL=http://127.0.0.1:8080 npm run test:api` | Authenticated PHP/MySQL behavior, route access, CSRF rejection |
| Browser E2E | `npm run test:e2e` | Main user workflow and persisted playbook note workflow |

## Route coverage snapshot

| Coverage area | Current value |
|---|---:|
| API routes listed in matrix | 17 / 17 |
| API routes directly exercised by integration tests | 16 / 17 |
| State-changing routes with CSRF rejection coverage | 10 / 10 |
| Primary E2E workflows covered | 2 |

## API route coverage

| Method | Route | Auth required | CSRF required | API test coverage | E2E coverage | Notes |
|---|---|---:|---:|---:|---:|---|
| POST | `/api/auth/register` | No | No | Yes | Yes | Creates demo workspace |
| POST | `/api/auth/login` | No | No | Yes | Add | Tests valid and invalid login |
| POST | `/api/auth/logout` | Yes | Yes | Yes | Yes | Tests logout and missing CSRF |
| GET | `/api/auth/session` | No | No | Yes | Add | Tests unauthenticated and authenticated state |
| GET | `/api/health` | No | No | CI curl | No | Used by CI health check |
| GET | `/api/prospects` | Yes | No | Yes | Yes | Main list view |
| GET | `/api/prospects/:id` | Yes | No | Yes | Yes | Tests detail and cross-user isolation |
| POST | `/api/prospects/:id/notes` | Yes | Yes | Yes | Yes | Tests persistence and CSRF rejection |
| POST | `/api/prospects/:id/activities` | Yes | Yes | Yes | Yes | Tests persistence and metrics impact |
| POST | `/api/prospects/:id/cadence-tasks` | Yes | Yes | Yes | Add | Tests task creation |
| PATCH | `/api/cadence-tasks/:id` | Yes | Yes | Yes | Add | Tests task completion |
| POST | `/api/prospects/:id/stage-transitions` | Yes | Yes | Yes | Yes | Tests blocked, valid, and CSRF-rejected transition |
| PATCH | `/api/prospects/:id/review` | Yes | Yes | Yes | Add | Tests review fields |
| PATCH | `/api/prospects/:id/ownership` | Yes | Yes | Yes | Add | Tests owner/persona/due date update |
| PATCH | `/api/prospects/:id/ai-fields` | Yes | Yes | Yes | Yes/partial | Tests generated field edit |
| POST | `/api/demo/reset` | Yes | Yes | Yes | Add | Tests seeded reset and CSRF rejection |
| GET | `/api/metrics` | Yes | No | Yes | Yes | Tests range fallback and dashboard values |

## Next test improvements

- Browser E2E covers existing-account login, blocked stage transitions, ownership updates, cadence tasks, and demo reset.
- Frontend tests cover metrics empty/loading/error states, invalid prospect routes, optional scorecard fields, interval cleanup, and required form validation.
