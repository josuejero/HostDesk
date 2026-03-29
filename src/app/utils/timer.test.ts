import { getCountdownLabel, getTimerStatus } from './timer'
import { createRecord } from '../../tests/fixtures'

describe('timer utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats a remaining countdown and stays in the normal zone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const record = createRecord({
      nextTouchDueAt: '2026-03-31T12:00:00Z',
    })

    expect(getCountdownLabel(record)).toContain('remaining')
    expect(getTimerStatus(record)).toBe('normal')
  })

  it('returns warning when the next step is due within 24 hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const record = createRecord({
      nextTouchDueAt: '2026-03-29T18:00:00Z',
    })

    expect(getTimerStatus(record)).toBe('warning')
  })

  it('reports overdue and missing labels correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))

    const overdueRecord = createRecord({
      nextTouchDueAt: '2026-03-28T12:00:00Z',
    })

    expect(getCountdownLabel(overdueRecord)).toContain('Overdue by')
    expect(getTimerStatus(overdueRecord)).toBe('overdue')

    const missingRecord = createRecord({
      nextTouchDueAt: '',
    })

    expect(getCountdownLabel(missingRecord)).toBe('Next step missing')
    expect(getTimerStatus(missingRecord)).toBe('missing')
  })
})
