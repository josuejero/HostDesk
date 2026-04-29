import fc from 'fast-check'
import { createRecord, createScenario } from '../../tests/fixtures'
import type { ActivityChannel, ActivityType, LeadStage, ProspectRecord } from '../../types'
import {
  buildRoutingInsights,
  canMoveToStage,
  getQueueLabel,
} from './routing'
import {
  buildOperationalScorecard,
  evaluateExecutionScore,
  executionMaxTotal,
} from './scorecard'

const activityTypes: ActivityType[] = [
  'outbound-email',
  'call-attempt',
  'linkedin-touch',
  'reply-received',
  'meeting-booked',
  'enrichment-update',
  'ownership-changed',
  'stage-changed',
  'ai-draft-used',
  'note-added',
]

const activityChannels: ActivityChannel[] = ['email', 'call', 'linkedin', 'meeting', 'crm', 'internal']
const leadStages: LeadStage[] = ['New lead', 'Active', 'Meeting booked', 'Handoff ready', 'Nurture', 'Disqualified']
const queueLabels = [
  'Stale',
  'Research needed',
  'Meeting booked',
  'Handoff ready',
  'Nurture / disqualified',
  'New leads',
  'Follow-up due today',
  'Needs first touch',
]
const hygieneRisks = ['Low', 'Medium', 'High']

const shortText = fc.string({ maxLength: 80 })
const textList = fc.array(shortText, { maxLength: 4 })
const isoDate = fc
  .integer({
    min: Date.parse('2026-01-01T00:00:00Z'),
    max: Date.parse('2026-04-30T23:59:59Z'),
  })
  .map((timestamp) => new Date(timestamp).toISOString())
const maybeIsoDate = fc.option(isoDate, { nil: '' })

const activityArbitrary = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(...activityTypes),
  owner: shortText,
  timestamp: isoDate,
  channel: fc.constantFrom(...activityChannels),
  outcome: shortText,
  summary: shortText,
  nextStep: shortText,
  crmUpdated: fc.boolean(),
})

const recordArbitrary = fc
  .record({
    subject: shortText,
    company: shortText,
    segment: shortText,
    employeeRange: shortText,
    microsoftFootprint: textList,
    useCase: shortText,
    buyerPersona: shortText,
    leadSource: shortText,
    owner: shortText,
    stage: fc.constantFrom(...leadStages),
    stageEnteredAt: isoDate,
    createdAt: isoDate,
    lastTouchAt: maybeIsoDate,
    nextTouchDueAt: maybeIsoDate,
    painPoints: textList,
    objections: textList,
    buyingSignals: textList,
    activities: fc.array(activityArbitrary, { maxLength: 5 }),
    playbookMatches: textList,
    crmCompleteness: fc.integer({ min: -20, max: 140 }),
    disqualificationReason: shortText,
  })
  .map((overrides): ProspectRecord => createRecord(overrides))

describe('property-based workflow utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps routing insights inside known UI states for generated records', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    fc.assert(
      fc.property(recordArbitrary, textList, (record, tags) => {
        const scenario = createScenario({ tags })
        const insights = buildRoutingInsights(record, scenario)
        const gate = canMoveToStage(record, record.stage, scenario)

        expect(queueLabels).toContain(getQueueLabel(record))
        expect(queueLabels).toContain(insights.queueLabel)
        expect(hygieneRisks).toContain(insights.dataHygieneRisk)
        expect(insights.microsoftMotion.trim().length).toBeGreaterThan(0)
        expect(typeof gate.allowed).toBe('boolean')
        expect(gate.message.trim().length).toBeGreaterThan(0)
      }),
    )
  })

  it('keeps generated scorecards bounded by each metric max', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    fc.assert(
      fc.property(recordArbitrary, textList, (record, tags) => {
        const scenario = createScenario({ tags })
        const scorecards = [
          buildOperationalScorecard(record, scenario),
          evaluateExecutionScore(record, scenario),
        ]

        for (const scorecard of scorecards) {
          const maxTotal = scorecard.metrics.reduce((sum, metric) => sum + metric.max, 0)

          expect(scorecard.total).toBe(scorecard.metrics.reduce((sum, metric) => sum + metric.value, 0))
          expect(scorecard.total).toBeGreaterThanOrEqual(0)
          expect(scorecard.total).toBeLessThanOrEqual(maxTotal)

          for (const metric of scorecard.metrics) {
            expect(metric.value).toBeGreaterThanOrEqual(0)
            expect(metric.value).toBeLessThanOrEqual(metric.max)
          }
        }

        expect(scorecards[1].total).toBeLessThanOrEqual(executionMaxTotal)
      }),
    )
  })
})
