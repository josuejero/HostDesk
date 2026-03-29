import {
  buildRoutingInsights,
  canMoveToStage,
  getMicrosoftMotion,
  getQueueLabel,
  isRecordStale,
} from './routing'
import { createRecord, createScenario } from '../../tests/fixtures'

describe('routing utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('routes missing owner or next step into research-needed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const scenario = createScenario({
      tags: ['citrix', 'avd'],
    })

    const record = createRecord({
      owner: '',
      nextTouchDueAt: '',
      subject: 'Citrix migration review',
      useCase: 'Citrix to AVD migration',
    })

    const insights = buildRoutingInsights(record, scenario)
    expect(getQueueLabel(record)).toBe('Research needed')
    expect(insights.dataHygieneHeadline).toBe('Data hygiene risk: High')
    expect(getMicrosoftMotion(record, scenario)).toBe('Azure Virtual Desktop')
  })

  it('flags stale records and keeps meeting-booked stage gated by activity proof', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const staleRecord = createRecord({
      lastTouchAt: '2026-03-01T12:00:00Z',
      nextTouchDueAt: '2026-03-05T12:00:00Z',
    })

    expect(isRecordStale(staleRecord)).toBe(true)
    expect(getQueueLabel(staleRecord)).toBe('Stale')

    const blockedMeetingRecord = createRecord({
      activities: [],
      stage: 'Active',
    })

    expect(canMoveToStage(blockedMeetingRecord, 'Meeting booked')).toEqual({
      allowed: false,
      message: 'Meeting booked requires outbound activity plus a reply or meeting event in the timeline.',
    })
  })

  it('allows handoff-ready only when owner, persona, next step, and Microsoft fit exist', () => {
    const scenario = createScenario({
      tags: ['msp', 'multi-tenant', 'avd'],
    })

    const strongRecord = createRecord({
      owner: 'Leo Martinez',
      buyerPersona: 'VP of Managed Workplace',
      nextTouchDueAt: '2026-03-31T16:00:00Z',
      lastTouchAt: '2026-03-28T19:00:00Z',
      subject: 'Need help with multi-tenant AVD operations',
      useCase: 'Multi-tenant AVD management',
    })

    expect(canMoveToStage(strongRecord, 'Handoff ready', scenario).allowed).toBe(true)
  })
})
