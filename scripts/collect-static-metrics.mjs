import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const today = new Date().toISOString().slice(0, 10)

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'metrics',
])

function walk(dir) {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const relativePath = path.relative(root, fullPath)
      const topLevelDir = relativePath.split(path.sep)[0]

      if (!ignoredDirs.has(topLevelDir)) files.push(...walk(fullPath))
      continue
    }
    files.push(fullPath)
  }

  return files
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function countMatches(files, pattern) {
  return files.reduce((total, filePath) => {
    const matches = read(filePath).match(pattern)
    return total + (matches ? matches.length : 0)
  }, 0)
}

function countJsonArray(relativePath) {
  const filePath = path.join(root, relativePath)
  if (!fs.existsSync(filePath)) return 0
  const parsed = JSON.parse(read(filePath))
  return Array.isArray(parsed) ? parsed.length : 0
}

function countFiles(relativePath, predicate) {
  return walk(path.join(root, relativePath)).filter(predicate).length
}

const routeFiles = walk(path.join(root, 'api/src/routes')).filter((filePath) => filePath.endsWith('.php'))
const schemaFile = path.join(root, 'api/database/schema.sql')
const schema = fs.existsSync(schemaFile) ? read(schemaFile) : ''
const sourceAndTestFiles = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'tests')),
].filter((filePath) => /\.(test|e2e)\.(ts|tsx)$/.test(filePath))

const metrics = {
  updatedAt: today,
  project: 'HostDesk',
  scope: {
    apiRouteEntries: countMatches(routeFiles, /'method'\s*=>/g),
    databaseTables: (schema.match(/^CREATE TABLE/gm) ?? []).length,
    databaseIndexes: (schema.match(/\bINDEX\s+/g) ?? []).length,
    databaseForeignKeys: (schema.match(/FOREIGN KEY/g) ?? []).length,
    reactComponentFiles: countFiles('src/app/components', (filePath) => filePath.endsWith('.tsx')),
    seedScenarios: countJsonArray('data/scenario-catalog.json'),
    kbArticles: countJsonArray('data/kb-articles.json'),
    cannedReplies: countJsonArray('data/canned-replies.json'),
    executableTestCases: countMatches(sourceAndTestFiles, /\b(?:it|test)\s*\(\s*['"`]/g),
    workflowFiles: countFiles('.github/workflows', (filePath) => /\.ya?ml$/.test(filePath)),
  },
  quality: {
    statementCoveragePct: null,
    branchCoveragePct: null,
    functionCoveragePct: null,
    lineCoveragePct: null,
  },
  performance: {
    lighthousePerformance: null,
    lighthouseAccessibility: null,
    lighthouseBestPractices: null,
    lighthouseSeo: null,
    largestContentfulPaintMs: null,
    totalBlockingTimeMs: null,
    cumulativeLayoutShift: null,
  },
  security: {
    runtimeNpmCriticalVulnerabilities: null,
    runtimeNpmHighVulnerabilities: null,
    fullNpmCriticalVulnerabilities: null,
    fullNpmHighVulnerabilities: null,
    fullNpmModerateVulnerabilities: null,
    dependabotOpenAlerts: null,
    codeScanningOpenAlerts: null,
    openssfScorecard: null,
  },
}

fs.mkdirSync(path.join(root, 'metrics/history'), { recursive: true })
fs.writeFileSync(path.join(root, 'metrics/latest.json'), `${JSON.stringify(metrics, null, 2)}\n`)
fs.writeFileSync(path.join(root, `metrics/history/${today}.json`), `${JSON.stringify(metrics, null, 2)}\n`)

console.log(JSON.stringify(metrics, null, 2))
