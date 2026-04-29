import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const today = new Date().toISOString().slice(0, 10)
const latestPath = path.join(root, 'metrics/latest.json')
const historyPath = path.join(root, `metrics/history/${today}.json`)

function readJson(relativePath) {
  const filePath = path.join(root, relativePath)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function scoreToPct(score) {
  return typeof score === 'number' ? Math.round(score * 100) : null
}

function resolveLighthouseJsonPath(jsonPath) {
  if (jsonPath && fs.existsSync(jsonPath)) {
    return jsonPath
  }

  if (!jsonPath) {
    return null
  }

  const fallbackPath = path.join(root, 'metrics/reports/lighthouse', path.basename(jsonPath))

  return fs.existsSync(fallbackPath) ? fallbackPath : null
}

function readLighthouseRun() {
  const manifest = readJson('metrics/reports/lighthouse/manifest.json')
  if (!Array.isArray(manifest) || manifest.length === 0) return null

  const run = manifest.find((item) => item.isRepresentativeRun) ?? manifest.at(-1)
  const reportPath = resolveLighthouseJsonPath(run?.jsonPath)

  if (!reportPath) {
    return { summary: run?.summary ?? {} }
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  return {
    summary: run.summary ?? {},
    audits: report.audits ?? {},
  }
}

function auditNumericValue(lighthouseRun, auditId) {
  const value = lighthouseRun?.audits?.[auditId]?.numericValue
  return typeof value === 'number' ? value : null
}

if (!fs.existsSync(latestPath)) {
  throw new Error('metrics/latest.json is missing. Run npm run metrics:static first.')
}

const metrics = JSON.parse(fs.readFileSync(latestPath, 'utf8'))
const coverage = readJson('metrics/reports/coverage/coverage-summary.json')
const fullAudit = readJson('metrics/reports/npm-audit.json')
const runtimeAudit = readJson('metrics/reports/npm-audit-prod.json')
const lighthouseRun = readLighthouseRun()

metrics.updatedAt = today

if (coverage?.total) {
  metrics.quality.statementCoveragePct = coverage.total.statements?.pct ?? null
  metrics.quality.branchCoveragePct = coverage.total.branches?.pct ?? null
  metrics.quality.functionCoveragePct = coverage.total.functions?.pct ?? null
  metrics.quality.lineCoveragePct = coverage.total.lines?.pct ?? null
}

if (lighthouseRun) {
  metrics.performance.lighthousePerformance = scoreToPct(lighthouseRun.summary.performance)
  metrics.performance.lighthouseAccessibility = scoreToPct(lighthouseRun.summary.accessibility)
  metrics.performance.lighthouseBestPractices = scoreToPct(lighthouseRun.summary['best-practices'])
  metrics.performance.lighthouseSeo = scoreToPct(lighthouseRun.summary.seo)
  metrics.performance.largestContentfulPaintMs = auditNumericValue(lighthouseRun, 'largest-contentful-paint')
  metrics.performance.totalBlockingTimeMs = auditNumericValue(lighthouseRun, 'total-blocking-time')
  metrics.performance.cumulativeLayoutShift = auditNumericValue(lighthouseRun, 'cumulative-layout-shift')
}

if (runtimeAudit?.metadata?.vulnerabilities) {
  metrics.security.runtimeNpmCriticalVulnerabilities = runtimeAudit.metadata.vulnerabilities.critical ?? null
  metrics.security.runtimeNpmHighVulnerabilities = runtimeAudit.metadata.vulnerabilities.high ?? null
}

if (fullAudit?.metadata?.vulnerabilities) {
  metrics.security.fullNpmCriticalVulnerabilities = fullAudit.metadata.vulnerabilities.critical ?? null
  metrics.security.fullNpmHighVulnerabilities = fullAudit.metadata.vulnerabilities.high ?? null
  metrics.security.fullNpmModerateVulnerabilities = fullAudit.metadata.vulnerabilities.moderate ?? null
}

fs.mkdirSync(path.dirname(historyPath), { recursive: true })
fs.writeFileSync(latestPath, `${JSON.stringify(metrics, null, 2)}\n`)
fs.writeFileSync(historyPath, `${JSON.stringify(metrics, null, 2)}\n`)

console.log(JSON.stringify(metrics, null, 2))
