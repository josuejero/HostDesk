import type { ProspectRecord, ScenarioSeed, Scorecard, ScorecardMetric } from '../../types'
import {
  canMoveToStage,
  getDataHygieneRisk,
  getIcpFit,
  getMicrosoftMotion,
  hasDatedNextStep,
  hasOutboundActivity,
  hasResponseOrMeetingActivity,
  isFollowUpDueToday,
  isRecordStale,
} from './routing'

export type ExecutionMetricDefinition = {
  id: string
  label: string
  max: number
  baseNote: string
}

export const executionMetricBlueprint: ExecutionMetricDefinition[] = [
  {
    id: 'research',
    label: 'Account research',
    max: 10,
    baseNote: 'Capture use case, pain points, and Microsoft workload context.',
  },
  {
    id: 'cadence',
    label: 'Cadence discipline',
    max: 10,
    baseNote: 'Keep the record touched and tied to a dated next step.',
  },
  {
    id: 'personalization',
    label: 'Personalization',
    max: 10,
    baseNote: 'Make outreach sound account-specific, not generic.',
  },
  {
    id: 'nextStep',
    label: 'Next-step clarity',
    max: 10,
    baseNote: 'Every active record needs a concrete next move.',
  },
  {
    id: 'stageDiscipline',
    label: 'Stage discipline',
    max: 10,
    baseNote: 'Only move stages when the evidence exists.',
  },
  {
    id: 'handoff',
    label: 'Handoff signal',
    max: 10,
    baseNote: 'Capture what the next team would need to keep momentum.',
  },
]

export const executionMaxTotal = executionMetricBlueprint.reduce((sum, metric) => sum + metric.max, 0)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const buildOperationalScorecard = (record: ProspectRecord, scenario?: ScenarioSeed): Scorecard => {
  const motion = getMicrosoftMotion(record, scenario)
  const icpFit = getIcpFit(record, scenario)
  const stale = isRecordStale(record)
  const hygieneRisk = getDataHygieneRisk(record)
  const dueToday = isFollowUpDueToday(record)
  const responseOrMeeting = hasResponseOrMeetingActivity(record)

  const metrics: ScorecardMetric[] = [
    {
      id: 'crmCompleteness',
      label: 'CRM completeness',
      max: 15,
      value: clamp(Math.round(record.crmCompleteness / 100 * 15), 0, 15),
      note:
        record.crmCompleteness >= 85
          ? 'Core account, workload, and buyer data are documented.'
          : 'Fill more core fields so the record is usable without extra context hunting.',
    },
    {
      id: 'dataHygiene',
      label: 'Data hygiene',
      max: 15,
      value: hygieneRisk === 'Low' ? 15 : hygieneRisk === 'Medium' ? 10 : 4,
      note:
        hygieneRisk === 'Low'
          ? 'Owner, stage evidence, and dated next step are in good shape.'
          : hygieneRisk === 'Medium'
          ? 'The record is usable, but field quality still needs tightening.'
          : 'Missing ownership, stale cadence, or no dated next step is dragging the record down.',
    },
    {
      id: 'icpFitJudgment',
      label: 'ICP fit judgment',
      max: 15,
      value: icpFit === 'Strong' ? 15 : icpFit === 'Moderate' ? 11 : 6,
      note:
        motion === 'Mixed motion'
          ? 'The Microsoft workload story is still fuzzy.'
          : `The record aligns most clearly to a ${motion} motion.`,
    },
    {
      id: 'followUpTimeliness',
      label: 'Follow-up timeliness',
      max: 15,
      value: stale ? 2 : dueToday ? 11 : hasDatedNextStep(record) ? 14 : 4,
      note: stale
        ? 'The record is stale and should not be treated as healthy active pipeline.'
        : dueToday
        ? 'The next touch is due today.'
        : hasDatedNextStep(record)
        ? 'The next touch is dated and currently on track.'
        : 'There is no dated next step on the record.',
    },
    {
      id: 'personalizationQuality',
      label: 'Personalization quality',
      max: 10,
      value: responseOrMeeting ? 9 : hasOutboundActivity(record) ? 7 : 4,
      note: responseOrMeeting
        ? 'The activity history shows two-way engagement, which usually reflects better targeting.'
        : hasOutboundActivity(record)
        ? 'Outbound activity exists, but proof of resonance is still limited.'
        : 'No external touch has been logged yet.',
    },
    {
      id: 'nextStepClarity',
      label: 'Next-step clarity',
      max: 10,
      value: hasDatedNextStep(record) ? 9 : 3,
      note: hasDatedNextStep(record)
        ? 'The record has a concrete, dated next step.'
        : 'Add a dated next step before treating this as active work.',
    },
    {
      id: 'handoffReadiness',
      label: 'Handoff readiness',
      max: 10,
      value: canMoveToStage(record, 'Handoff ready', scenario).allowed ? 10 : record.stage === 'Meeting booked' ? 6 : 3,
      note: canMoveToStage(record, 'Handoff ready', scenario).allowed
        ? 'The record is complete enough for the next team to pick up without rediscovery.'
        : 'Owner, buyer persona, Microsoft fit, and dated next step must all be present before handoff.',
    },
    {
      id: 'reportingCompleteness',
      label: 'Reporting completeness',
      max: 10,
      value: record.activities.length >= 3 ? 9 : record.activities.length >= 2 ? 7 : 5,
      note:
        record.activities.length >= 3
          ? 'The timeline is detailed enough for weekly pipeline review.'
          : 'Add richer activity history so the record tells a clearer reporting story.',
    },
  ]

  return {
    metrics,
    total: metrics.reduce((sum, metric) => sum + metric.value, 0),
  }
}

export const evaluateExecutionScore = (record: ProspectRecord, scenario?: ScenarioSeed): Scorecard => {
  const stageGate = canMoveToStage(record, record.stage, scenario)
  const hasSignals = record.buyingSignals.length > 0
  const hasPain = record.painPoints.length > 0
  const activityText = record.activities.map((activity) => activity.summary.toLowerCase()).join(' ')
  const personalization = /(cost|contractor|audit|multi-tenant|clinical|lab|budget|citrix)/.test(activityText)

  const metrics: ScorecardMetric[] = executionMetricBlueprint.map((definition) => {
    let value = 0
    let note = definition.baseNote

    switch (definition.id) {
      case 'research':
        value = hasSignals && hasPain ? 10 : hasPain ? 7 : 4
        note = hasSignals && hasPain
          ? 'Pain points and buying signals are both documented.'
          : 'Capture both pain points and buying signals so the record is grounded.'
        break
      case 'cadence':
        value = isRecordStale(record) ? 1 : hasDatedNextStep(record) ? 9 : 3
        note = isRecordStale(record)
          ? 'The record is stale.'
          : hasDatedNextStep(record)
          ? 'A dated next step keeps the cadence healthy.'
          : 'Add a dated next step to restore cadence discipline.'
        break
      case 'personalization':
        value = personalization ? 9 : hasOutboundActivity(record) ? 6 : 3
        note = personalization
          ? 'Recent activity references account-specific context.'
          : 'Make the motion sound specific to the account’s workload and timing.'
        break
      case 'nextStep':
        value = hasDatedNextStep(record) ? 9 : 2
        note = hasDatedNextStep(record)
          ? 'The next move is visible and dated.'
          : 'There is no dated next move yet.'
        break
      case 'stageDiscipline':
        value = stageGate.allowed ? 10 : 3
        note = stageGate.allowed ? 'The current stage is defensible.' : stageGate.message
        break
      case 'handoff':
        value = canMoveToStage(record, 'Handoff ready', scenario).allowed ? 9 : record.stage === 'Meeting booked' ? 6 : 3
        note = canMoveToStage(record, 'Handoff ready', scenario).allowed
          ? 'The next team would inherit a clean story.'
          : 'The handoff package still needs more structure.'
        break
      default:
        value = 0
    }

    return {
      id: definition.id,
      label: definition.label,
      max: definition.max,
      value,
      note,
    }
  })

  return {
    metrics,
    total: metrics.reduce((sum, metric) => sum + metric.value, 0),
  }
}
