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
| npm dependency audit | `npm audit --json` | Baseline captured: 0 critical, 4 high, 4 moderate, 3 low |
| Dependency alerting | Dependabot | Pending after GitHub push |
| Static code scanning | CodeQL for JavaScript/TypeScript and Actions | Pending after GitHub push |
| Repository security posture | OpenSSF Scorecard | Pending after GitHub push |

## Known limits

- CodeQL evidence should not be described as full PHP analysis.
- This is a portfolio/demo project, not a hardened production SaaS deployment.
- The static deployment does not prove the full PHP/MySQL API is deployed publicly.
