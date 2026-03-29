import { scenarioCatalog } from '../data'
import { cloneRecord } from '../app/utils/helpers'
import type { CRMHygieneReview, ProspectRecord, ScenarioSeed, Scorecard } from '../types'

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const baseScenario = scenarioCatalog[0]

export const baseScorecard: Scorecard = deepClone(baseScenario.record.scorecard)

export const baseReview: CRMHygieneReview = deepClone(baseScenario.record.review)

export const createRecord = (overrides: Partial<ProspectRecord> = {}): ProspectRecord => {
  const defaultRecord = cloneRecord(baseScenario.record)
  return {
    ...defaultRecord,
    ...overrides,
    microsoftFootprint: overrides.microsoftFootprint ? [...overrides.microsoftFootprint] : [...defaultRecord.microsoftFootprint],
    painPoints: overrides.painPoints ? [...overrides.painPoints] : [...defaultRecord.painPoints],
    objections: overrides.objections ? [...overrides.objections] : [...defaultRecord.objections],
    buyingSignals: overrides.buyingSignals ? [...overrides.buyingSignals] : [...defaultRecord.buyingSignals],
    activities: overrides.activities ? deepClone(overrides.activities) : deepClone(defaultRecord.activities),
    playbookMatches: overrides.playbookMatches ? [...overrides.playbookMatches] : [...defaultRecord.playbookMatches],
    review: overrides.review ? { ...baseReview, ...overrides.review } : deepClone(defaultRecord.review),
    scorecard: overrides.scorecard ? deepClone(overrides.scorecard) : deepClone(defaultRecord.scorecard),
  }
}

export const createScenario = (overrides: Partial<ScenarioSeed> = {}): ScenarioSeed => {
  const recordOverrides = overrides.record ?? {}
  return {
    ...baseScenario,
    ...overrides,
    record: createRecord(recordOverrides),
  }
}
