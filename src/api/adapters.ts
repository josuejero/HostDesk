import { scenarioCatalog } from '../data'
import type {
  ProspectDetail,
  ProspectRecord,
  ProspectSummary,
  ScenarioSeed,
} from '../types'
import { buildOperationalScorecard } from '../app/utils/scorecard'

export const scenarioByExternalKey = new Map<string, ScenarioSeed>(
  scenarioCatalog.map((scenario) => [scenario.record.id, scenario]),
)

const emptyRecordCollections = {
  activities: [],
  notes: [],
  cadenceTasks: [],
  stageHistory: [],
}

const buildRecord = (summary: ProspectSummary, detail?: ProspectDetail): ProspectRecord => {
  const scenario = scenarioByExternalKey.get(summary.externalKey)
  const record: ProspectRecord = {
    id: summary.externalKey || summary.id,
    persistedId: summary.id,
    externalKey: summary.externalKey,
    subject: summary.subject,
    company: summary.company,
    segment: summary.segment,
    employeeRange: summary.employeeRange,
    microsoftFootprint: [...summary.microsoftFootprint],
    useCase: summary.useCase,
    buyerPersona: summary.buyerPersona,
    leadSource: summary.leadSource,
    owner: summary.owner,
    stage: summary.stage,
    stageEnteredAt: summary.stageEnteredAt,
    createdAt: summary.createdAt,
    lastTouchAt: summary.lastTouchAt,
    nextTouchDueAt: summary.nextTouchDueAt,
    painPoints: [...summary.painPoints],
    objections: [...summary.objections],
    buyingSignals: [...summary.buyingSignals],
    activities: detail?.activities ? [...detail.activities] : [...emptyRecordCollections.activities],
    playbookMatches: [...summary.playbookMatches],
    review: { ...summary.review },
    scorecard: { total: 0, metrics: [] },
    aiSummary: summary.aiSummary,
    recommendedNextAction: summary.recommendedNextAction,
    crmCompleteness: summary.crmCompleteness,
    disqualificationReason: summary.disqualificationReason,
    notes: detail?.notes ? [...detail.notes] : [...emptyRecordCollections.notes],
    cadenceTasks: detail?.cadenceTasks ? [...detail.cadenceTasks] : [...emptyRecordCollections.cadenceTasks],
    stageHistory: detail?.stageHistory ? [...detail.stageHistory] : [...emptyRecordCollections.stageHistory],
  }

  return {
    ...record,
    scorecard: buildOperationalScorecard(record, scenario),
  }
}

export const adaptProspectSummary = (summary: ProspectSummary) => buildRecord(summary)

export const adaptProspectDetail = (detail: ProspectDetail) => buildRecord(detail, detail)

export const upsertSummary = (summaries: ProspectSummary[], next: ProspectSummary) => {
  const existingIndex = summaries.findIndex((summary) => summary.id === next.id)
  if (existingIndex === -1) {
    return [next, ...summaries]
  }

  return summaries.map((summary) => (summary.id === next.id ? next : summary))
}
