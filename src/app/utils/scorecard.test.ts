import { applyScoreDelta, evaluateDeEscalationScore, refreshClosureScore } from './scorecard'
import { basePostmortem, baseScenario, baseScorecard, createScenario, createTicket } from '../../tests/fixtures'

describe('scorecard utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it('applies deltas and clamps values while updating totals', () => {
    const starting = JSON.parse(JSON.stringify(baseScorecard))

    const updated = applyScoreDelta(starting, 'communication', 5)
    const communication = updated.metrics.find((metric) => metric.id === 'communication')
    expect(communication?.value).toBe(5)
    expect(updated.total).toBe(5)

    const clamped = applyScoreDelta(updated, 'communication', 100)
    expect(clamped.metrics.find((metric) => metric.id === 'communication')?.value).toBe(20)
    expect(clamped.total).toBeGreaterThanOrEqual(20)
  })

  it('refreshes the closure metric based on how many postmortem fields are filled', () => {
    const scorecard = JSON.parse(JSON.stringify(baseScorecard))
    const postmortem = {
      ...basePostmortem,
      rootCause: 'Issue uncovered',
      fix: 'Patched the job',
      followUp: '',
      prevention: '',
      knowledgeArticleStatus: '',
    }
    const refreshed = refreshClosureScore(scorecard, postmortem)
    const closure = refreshed.metrics.find((metric) => metric.id === 'closureCompleteness')
    expect(closure?.value).toBe(Math.round((2 / 4) * (closure?.max ?? 10)))
    expect(refreshed.total).toBe(refreshed.metrics.reduce((sum, metric) => sum + metric.value, 0))
  })

  it('evaluates each de-escalation metric when routing and escalation cues are present', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'))

    const scenario = createScenario({
      bucket: 'Billing/Account',
      tags: ['billing', 'finance'],
      customerProfile: { ...baseScenario.customerProfile, slaEntitlementMinutes: 60 },
      escalationRules: { path: ['Tier 1', 'Tier 2', 'Tier 3'], currentTier: 'Tier 2', notes: '' },
    })

    const ticket = createTicket({
      status: 'Escalated',
      department: 'Billing & Accounts',
      plan: 'Premium',
      escalationTier: 'Tier 2',
      createdAt: '2026-03-05T10:00:00Z',
      postmortem: {
        ...basePostmortem,
        rootCause: 'Billing flag stuck',
        fix: 'Reset webhook sequence',
        followUp: 'Alert billing team',
        prevention: 'Monitor webhook race',
        knowledgeArticleStatus: 'yes',
      },
      thread: [
        {
          id: 'customer-1',
          author: 'Morgan (customer)',
          audience: 'customer',
          createdAt: '2026-03-05T10:05:00Z',
          message: 'Thanks, the panel is still suspended despite payment.',
        },
        {
          id: 'agent-1',
          author: 'HostDesk Agent',
          audience: 'customer',
          createdAt: '2026-03-05T10:07:00Z',
          message:
            'I appreciate the patience — I will escalate to Tier 3 billing, share the next steps on how we release the hold, and keep you posted tomorrow.',
        },
      ],
    })
    const metrics = evaluateDeEscalationScore(ticket, scenario).metrics
    const findMetric = (id: string) => metrics.find((metric) => metric.id === id)

    expect(findMetric('empathy')?.value).toBe(10)
    expect(findMetric('clarity')?.value).toBe(10)
    expect(findMetric('ownership')?.value).toBe(10)
    expect(findMetric('routing')?.value).toBe(10)
    expect(findMetric('escalation')?.value).toBe(10)
    expect(findMetric('expectation')?.value).toBe(10)
    expect(findMetric('closure')?.value).toBe(0)

    vi.useRealTimers()
  })

  it('rewards closure completeness when solved and the postmortem is documented', () => {
    const scenario = createScenario()
    const ticket = createTicket({
      status: 'Solved',
      postmortem: {
        ...basePostmortem,
        rootCause: 'Repro steps captured',
        fix: 'Applied patch',
        followUp: 'Sent recap',
        prevention: 'Documented checklist',
        knowledgeArticleStatus: 'yes',
      },
      thread: [
        {
          id: 'agent-close',
          author: 'HostDesk Agent',
          audience: 'customer',
          createdAt: new Date().toISOString(),
          message: 'Closure summary shared with the customer.',
        },
      ],
    })

    const closureMetric = evaluateDeEscalationScore(ticket, scenario).metrics.find((metric) => metric.id === 'closure')
    expect(closureMetric?.value).toBe(10)
  })
})
