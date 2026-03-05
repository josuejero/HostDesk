import { buildRoutingInsights, getPanelStatus } from './routing'
import { baseScenario, createScenario, createTicket } from '../../tests/fixtures'

describe('routing utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flags the billing suspension path, billing headline, and escalation when SLA is missed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-05T11:30:00Z'))

    const scenario = createScenario({
      bucket: 'Billing/Account',
      tags: ['billing'],
      escalationRules: { path: ['Tier 1', 'Tier 2', 'Tier 3'], currentTier: 'Tier 2', notes: '' },
      customerProfile: { ...baseScenario.customerProfile, slaEntitlementMinutes: 60 },
    })

    const ticket = createTicket({
      department: 'Billing & Accounts',
      invoiceState: 'Paid - Suspended',
      createdAt: '2026-03-05T09:00:00Z',
      slaTargetMinutes: 60,
      status: 'Escalated',
      escalationTier: 'Tier 2',
      recentIncidents: ['Invoice says paid but panel stuck suspended'],
    })

    const insights = buildRoutingInsights(ticket, scenario)
    expect(insights.queueLabel).toBe('Billing & Accounts')
    expect(insights.billingHeadline).toBe('Billing urgency: High')
    expect(insights.escalationHeadline).toBe('Escalation triggered')
    expect(insights.panelStatus).toBe('Panel locked by billing suspension')
  })

  it('returns a technical queue when outage keywords dominate and keeps the tier stable', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'))

    const scenario = createScenario({
      bucket: 'Technical',
      description: 'Service outage due to CDN change',
      tags: ['outage'],
      escalationRules: { path: ['Tier 1', 'Tier 2'], currentTier: 'Tier 1', notes: '' },
    })

    const ticket = createTicket({
      department: 'Technical Operations',
      invoiceState: 'Active',
      createdAt: '2026-03-05T11:30:00Z',
      slaTargetMinutes: 45,
      status: 'Open',
      escalationTier: 'Tier 1',
      recentIncidents: ['Service unavailable after CDN change'],
      subject: 'Service outage after CDN change',
    })

    const insights = buildRoutingInsights(ticket, scenario)
    expect(insights.queueLabel).toBe('Technical Operations')
    expect(insights.escalationHeadline).toBe('Tier stable')
    expect(insights.billingHeadline).toBe('Billing steady')
  })

  it('identifies login loop and falls back to nominal status when nothing matches', () => {
    const loopTicket = createTicket({ subject: 'Panel login loop', invoiceState: 'Active' })
    expect(getPanelStatus(loopTicket)).toBe('Panel stuck in login loop')

    const nominalTicket = createTicket({
      subject: 'Friendly follow-up',
      invoiceState: 'Active',
      recentIncidents: [],
    })
    expect(getPanelStatus(nominalTicket)).toBe('Panel appears nominal')
  })
})
