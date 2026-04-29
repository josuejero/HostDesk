# HostDesk security checklist

## Implemented controls

| Control | Status | Evidence |
|---|---:|---|
| Password hashing | Implemented | API auth service |
| Login-attempt tracking | Implemented | `login_attempts` table and auth flow |
| Session ID regeneration after login | Implemented | `Auth::login()` |
| CSRF token validation on state-changing authenticated requests | Implemented | `Auth::requireCsrf()` and route handlers |
| Auth required for prospect, cadence, metrics, and demo reset routes | Implemented | API route handlers |
| Foreign-key constraints for user/prospect-owned records | Implemented | `api/database/schema.sql` |

## Automated security evidence

| Check | Tool | Status |
|---|---|---:|
| Runtime npm dependency audit | `npm run audit:prod` | Baseline captured: 0 high/critical |
| Full npm dependency audit | `npm run audit:json` | Baseline captured: 0 critical, 0 high, 2 moderate dev-tooling, 3 low |
| PHP syntax check | `npm run php:lint` | Passing |
| Seed data schema validation | `npm run data:validate` | Passing |
| Dependency alerting | Dependabot | Pending after GitHub push |
| Static code scanning | CodeQL for JavaScript/TypeScript and Actions | Pending after GitHub push |
| Repository security posture | OpenSSF Scorecard | Pending after GitHub push |

## Known limits

- CodeQL evidence should not be described as full PHP analysis.
- The remaining full-tree npm findings are dev-tooling findings and should not be presented as runtime risk.
- This is a portfolio/demo project, not a hardened production SaaS deployment.
- The static deployment does not prove the full PHP/MySQL API is deployed publicly.
