import fs from 'node:fs'
import path from 'node:path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const root = process.cwd()
const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
let hasFailures = false

const schemaFiles = [
  'data/schemas/customer-account.json',
  'data/schemas/ticket.json',
  'data/schemas/scenario-catalog.json',
  'data/schemas/kb-article.json',
  'data/schemas/canned-reply.json',
  'data/schemas/scoring-rubric.json',
]

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

function formatErrors(errors) {
  return ajv.errorsText(errors, { separator: '\n  ' })
}

function validateUniqueIds(dataPath, items) {
  const seen = new Set()

  items.forEach((item, index) => {
    if (!item?.id) return

    if (seen.has(item.id)) {
      hasFailures = true
      console.error(`${dataPath}[${index}]: duplicate id "${item.id}"`)
    }

    seen.add(item.id)
  })
}

for (const schemaFile of schemaFiles) {
  ajv.addSchema(readJson(schemaFile))
}

const validations = [
  {
    dataPath: 'data/scenario-catalog.json',
    schemaId: 'https://hostdesk.local/schemas/scenario-catalog.json',
  },
  {
    dataPath: 'data/kb-articles.json',
    schemaId: 'https://hostdesk.local/schemas/kb-article.json',
    each: true,
  },
  {
    dataPath: 'data/canned-replies.json',
    schemaId: 'https://hostdesk.local/schemas/canned-reply.json',
    each: true,
  },
  {
    dataPath: 'data/scoring-rubric.json',
    schemaId: 'https://hostdesk.local/schemas/scoring-rubric.json',
  },
]

for (const validation of validations) {
  const data = readJson(validation.dataPath)
  const validate = ajv.getSchema(validation.schemaId)

  if (!validate) {
    throw new Error(`Schema not registered: ${validation.schemaId}`)
  }

  if (validation.each) {
    if (!Array.isArray(data)) {
      hasFailures = true
      console.error(`${validation.dataPath}: expected an array`)
      continue
    }

    if (data.length === 0) {
      hasFailures = true
      console.error(`${validation.dataPath}: expected at least one item`)
      continue
    }

    validateUniqueIds(validation.dataPath, data)

    data.forEach((item, index) => {
      if (validate(item)) return
      hasFailures = true
      console.error(`${validation.dataPath}[${index}]:\n  ${formatErrors(validate.errors)}`)
    })
    continue
  }

  if (!validate(data)) {
    hasFailures = true
    console.error(`${validation.dataPath}:\n  ${formatErrors(validate.errors)}`)
  }
}

const scenarioCatalog = readJson('data/scenario-catalog.json')
validateUniqueIds('data/scenario-catalog.json', scenarioCatalog)
validateUniqueIds('data/scenario-catalog.json record', scenarioCatalog.map((scenario) => scenario.record))

const scoringRubric = readJson('data/scoring-rubric.json')
const totalWeight = scoringRubric.metrics.reduce((total, metric) => total + metric.weight, 0)
if (totalWeight !== 100) {
  hasFailures = true
  console.error(`data/scoring-rubric.json: metric weights must add up to 100, received ${totalWeight}`)
}

if (hasFailures) {
  process.exitCode = 1
} else {
  console.log('Seed data schema validation passed.')
}
