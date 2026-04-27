import { buildOperationalScorecard, evaluateExecutionScore, executionMaxTotal } from './scorecard'
import { createRecord, createScenario } from '../../tests/fixtures'

describe('scorecard utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds stronger operational scores for clean active records', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const scenario = createScenario()
    const record = createRecord({
      crmCompleteness: 92,
      owner: 'Avery Chen',
      buyerPersona: 'Director of Cloud Services',
      nextTouchDueAt: '2026-03-31T16:00:00Z',
    })

    const scorecard = buildOperationalScorecard(record, scenario)
    const hygiene = scorecard.metrics.find((metric) => metric.id === 'dataHygiene')
    const handoff = scorecard.metrics.find((metric) => metric.id === 'handoffReadiness')

    expect(scorecard.total).toBeGreaterThan(70)
    expect(hygiene?.value).toBeGreaterThanOrEqual(10)
    expect(handoff?.value).toBeGreaterThan(0)
  })

  it('penalizes stale records with missing next steps', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const record = createRecord({
      lastTouchAt: '2026-03-01T12:00:00Z',
      nextTouchDueAt: '',
      owner: '',
    })

    const scorecard = buildOperationalScorecard(record)
    const timeliness = scorecard.metrics.find((metric) => metric.id === 'followUpTimeliness')
    const hygiene = scorecard.metrics.find((metric) => metric.id === 'dataHygiene')

    expect(timeliness?.value).toBe(2)
    expect(hygiene?.value).toBe(4)
  })

  it('builds an execution score aligned to research, cadence, and stage discipline', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const scenario = createScenario()
    const record = createRecord({
      owner: 'Leo Martinez',
      buyerPersona: 'VP of Managed Workplace',
      nextTouchDueAt: '2026-03-31T16:00:00Z',
      stage: 'Handoff ready',
    })

    const scorecard = evaluateExecutionScore(record, scenario)

    expect(scorecard.total).toBeLessThanOrEqual(executionMaxTotal)
    expect(scorecard.metrics.find((metric) => metric.id === 'stageDiscipline')?.value).toBeGreaterThan(0)
  })
})
