# Metrics maintenance routine

Run this before updating the README or using metrics in a job application.

```bash
npm ci
npm run lint
npm run build
npm run test
npm run test:coverage

docker compose up -d --build
for i in {1..30}; do
  curl --fail http://127.0.0.1:8080/api/health && break
  sleep 2
done
HOSTDESK_API_BASE_URL=http://127.0.0.1:8080 npm run test:api
npm run test:e2e
docker compose down

npm run metrics:static
npm run audit:json
```

After running the commands:

1. Update `docs/project-metrics.md`.
2. Commit updated `metrics/latest.json` if you want a checked-in snapshot.
3. Keep generated HTML reports out of the repo unless you intentionally publish them.
4. Link to GitHub Actions artifacts for coverage, Playwright, and Lighthouse evidence.
