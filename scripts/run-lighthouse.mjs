import fs from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

const root = process.cwd()
const reportDir = path.join(root, 'metrics/reports/lighthouse')
const host = process.env.LIGHTHOUSE_HOST ?? '127.0.0.1'
const port = Number.parseInt(process.env.LIGHTHOUSE_PORT ?? '4173', 10)
const url = process.env.LIGHTHOUSE_URL ?? `http://${host}:${port}/`
const runCount = Number.parseInt(process.env.LIGHTHOUSE_RUNS ?? '3', 10)

if (!/^[a-zA-Z0-9.-]+$/.test(host) || !Number.isInteger(port) || port <= 0) {
  throw new Error('LIGHTHOUSE_HOST and LIGHTHOUSE_PORT must resolve to a local host and positive port.')
}

const thresholds = [
  { label: 'Performance', value: (summary) => summary.performance, min: 0.9 },
  { label: 'Accessibility', value: (summary) => summary.accessibility, min: 0.9 },
  { label: 'Best Practices', value: (summary) => summary['best-practices'], min: 0.9 },
  { label: 'Largest Contentful Paint', audit: 'largest-contentful-paint', maxNumericValue: 2500 },
  { label: 'Cumulative Layout Shift', audit: 'cumulative-layout-shift', maxNumericValue: 0.1 },
  { label: 'Total Blocking Time', audit: 'total-blocking-time', maxNumericValue: 200 },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForServer(targetUrl, timeoutMs = 30000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(targetUrl)
      if (response.ok) return
    } catch {
      // Retry until Vite preview is ready.
    }
    await sleep(500)
  }

  throw new Error(`Timed out waiting for preview server at ${targetUrl}`)
}

async function assertPortAvailable() {
  await new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', (error) => {
      reject(new Error(`Port ${port} is already in use. Stop the existing server or set LIGHTHOUSE_PORT.`))
    })
    server.once('listening', () => {
      server.close(resolve)
    })
    server.listen(port, host)
  })
}

function startPreviewServer() {
  const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm'
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run preview -- --host ${host} --port ${port} --strictPort`]
    : ['run', 'preview', '--', '--host', host, '--port', String(port), '--strictPort']

  const child = spawn(command, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr.on('data', (chunk) => process.stderr.write(chunk))

  return child
}

async function stopPreviewServer(child) {
  if (process.platform === 'win32' && child.pid) {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
      killer.on('error', resolve)
      killer.on('exit', resolve)
    })
    return
  }

  if (!child.killed) {
    child.kill()
  }
}

function summarizeCategories(lhr) {
  return Object.fromEntries(
    Object.entries(lhr.categories).map(([key, category]) => [key, category.score]),
  )
}

function representativeRunIndex(results) {
  const sorted = [...results].sort(
    (left, right) => (left.summary.performance ?? 0) - (right.summary.performance ?? 0),
  )
  const median = sorted[Math.floor(sorted.length / 2)]
  return results.findIndex((result) => result.jsonPath === median.jsonPath)
}

function thresholdWarnings(result) {
  const warnings = []

  for (const threshold of thresholds) {
    if ('audit' in threshold) {
      const value = result.lhr.audits[threshold.audit]?.numericValue
      if (typeof value === 'number' && value > threshold.maxNumericValue) {
        warnings.push(`${threshold.label} ${value} exceeds ${threshold.maxNumericValue}`)
      }
      continue
    }

    const value = threshold.value(result.summary)
    if (typeof value === 'number' && value < threshold.min) {
      warnings.push(`${threshold.label} ${value} is below ${threshold.min}`)
    }
  }

  return warnings
}

async function runLighthouse(index) {
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  })

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: ['json', 'html'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    })

    if (!result) {
      throw new Error('Lighthouse did not return a result.')
    }

    const reports = Array.isArray(result.report) ? result.report : [result.report]
    const jsonReport = reports.find((report) => report.trimStart().startsWith('{'))
    const htmlReport = reports.find((report) => report.trimStart().startsWith('<'))
    const jsonPath = path.join(reportDir, `lhr-${index}.json`)
    const htmlPath = path.join(reportDir, `lhr-${index}.html`)

    await fs.writeFile(jsonPath, jsonReport ?? JSON.stringify(result.lhr, null, 2))
    await fs.writeFile(htmlPath, htmlReport ?? '')

    return {
      url,
      jsonPath,
      htmlPath,
      summary: summarizeCategories(result.lhr),
      lhr: result.lhr,
    }
  } finally {
    try {
      await chrome.kill()
    } catch (error) {
      await sleep(500)
      try {
        await chrome.kill()
      } catch {
        console.warn(`Unable to fully clean up the Lighthouse Chrome profile: ${error.message}`)
      }
    }
  }
}

await fs.rm(reportDir, { recursive: true, force: true })
await fs.mkdir(reportDir, { recursive: true })
await assertPortAvailable()

const preview = startPreviewServer()

try {
  await waitForServer(url)

  const results = []
  for (let index = 1; index <= runCount; index += 1) {
    console.log(`Running Lighthouse ${index}/${runCount} for ${url}`)
    results.push(await runLighthouse(index))
  }

  const representativeIndex = representativeRunIndex(results)
  const manifest = results.map((result, index) => ({
    url: result.url,
    isRepresentativeRun: index === representativeIndex,
    htmlPath: result.htmlPath,
    jsonPath: result.jsonPath,
    summary: result.summary,
  }))

  await fs.writeFile(
    path.join(reportDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  const representative = results[representativeIndex]
  const warnings = thresholdWarnings(representative)

  if (warnings.length > 0) {
    console.warn('Lighthouse threshold warnings:')
    for (const warning of warnings) {
      console.warn(`- ${warning}`)
    }
  }

  console.log(`Lighthouse reports written to ${path.relative(root, reportDir)}`)
} finally {
  await stopPreviewServer(preview)
}
