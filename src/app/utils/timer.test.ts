import { getCountdownLabel, getTimerStatus } from './timer'
import { createTicket } from '../../tests/fixtures'

describe('timer utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats a remaining countdown and stays in the normal zone', () => {
    vi.useFakeTimers()
    const ticket = createTicket({
      createdAt: '2026-03-01T09:00:00Z',
      slaTargetMinutes: 60,
    })
    vi.setSystemTime(new Date('2026-03-01T09:30:00Z'))

    const label = getCountdownLabel(ticket)
    expect(label).toContain('30 minutes remaining')
    expect(getTimerStatus(ticket)).toBe('normal')
  })

  it('returns warning when under the 5-minute threshold', () => {
    vi.useFakeTimers()
    const ticket = createTicket({
      createdAt: '2026-03-05T11:30:00Z',
      slaTargetMinutes: 35,
    })
    vi.setSystemTime(new Date('2026-03-05T12:02:00Z'))

    expect(getTimerStatus(ticket)).toBe('warning')
  })

  it('reports overdue labels and status when the target has passed', () => {
    vi.useFakeTimers()
    const ticket = createTicket({
      createdAt: '2026-03-01T09:00:00Z',
      slaTargetMinutes: 60,
    })
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'))

    expect(getTimerStatus(ticket)).toBe('overdue')
    expect(getCountdownLabel(ticket)).toMatch(/Overdue by/) 
  })
})
