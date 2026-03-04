import type { ScenarioSeed, Scorecard, ScorecardMetric, Ticket } from '../../types'
import { clamp, isCustomerMessage } from './helpers'
import { isPostmortemComplete } from './postmortem'
import { buildRoutingInsights } from './routing'

export type DeEscalationMetricDefinition = {
  id: string
  label: string
  max: number
  baseNote: string
}

export const deEscalationMetricBlueprint: DeEscalationMetricDefinition[] = [
  {
    id: 'empathy',
    label: 'Empathy',
    max: 10,
    baseNote: 'Acknowledge the customer’s emotion before moving on.',
  },
  {
    id: 'clarity',
    label: 'Clarity',
    max: 10,
    baseNote: 'Lay out next steps or a timeline so expectations are clear.',
  },
  {
    id: 'ownership',
    label: 'Ownership',
    max: 10,
    baseNote: 'Use direct responsibility language like “I will” or “I’m taking point.”',
  },
  {
    id: 'routing',
    label: 'Correct routing',
    max: 10,
    baseNote: 'Reference the right desk (billing, ops, etc.) when routing a case.',
  },
  {
    id: 'escalation',
    label: 'Correct escalation',
    max: 10,
    baseNote: 'Match escalation language to the scenario requirements.',
  },
  {
    id: 'expectation',
    label: 'Expectation setting',
    max: 10,
    baseNote: 'State when the customer can expect your next update.',
  },
  {
    id: 'closure',
    label: 'Closure quality',
    max: 10,
    baseNote: 'Capture postmortem notes and follow-up before solving.',
  },
]

export const deEscalationMaxTotal = deEscalationMetricBlueprint.reduce((sum, metric) => sum + metric.max, 0)

export const applyScoreDelta = (
  scorecard: Ticket['scorecard'],
  metricId: string,
  delta: number,
): Ticket['scorecard'] => {
  const metrics = scorecard.metrics.map((metric) =>
    metric.id === metricId
      ? {
          ...metric,
          value: clamp(metric.value + delta, 0, metric.max),
        }
      : metric,
  )

  const total = metrics.reduce((sum, metric) => sum + metric.value, 0)
  return {
    ...scorecard,
    metrics,
    total,
  }
}

export const refreshClosureScore = (scorecard: Ticket['scorecard'], postmortem: Ticket['postmortem']) => {
  const metrics = scorecard.metrics.map((metric) => {
    if (metric.id !== 'closureCompleteness') {
      return metric
    }

    const filled = Object.values(postmortem).filter((value) => value.trim().length > 0).length
    const computed = Math.round((filled / 4) * metric.max)
    const newValue = clamp(Math.max(metric.value, computed), 0, metric.max)
    return { ...metric, value: newValue }
  })

  return {
    ...scorecard,
    metrics,
    total: metrics.reduce((sum, metric) => sum + metric.value, 0),
  }
}

export const evaluateDeEscalationScore = (ticket: Ticket, scenario?: ScenarioSeed): Scorecard => {
  const latestAgentReply = [...ticket.thread]
    .reverse()
    .find((entry) => entry.audience === 'customer' && !isCustomerMessage(entry))

  const replyText = latestAgentReply?.message ?? ''
  const normalizedText = replyText.toLowerCase()
  const sanitizedText = normalizedText.replace(/[^a-z0-9\s]/g, ' ')
  const hasReply = Boolean(latestAgentReply)

  const clarityPattern = /\b(next steps?|after that|then|eta|timeline|within\s+\d+\s+(minute|hour|day)s?|by\s+\d+\s+(minute|hour|day)s?|later today|tomorrow|this afternoon)\b/
  const ownershipPattern = /\b(i['’]?ll|i will|i am taking|i'm taking|i own this|i will take|i'll handle|i'm handling|i will follow|i'm following|i own it|i'm owning)\b/
  const empathyPattern = /\b(sorry|apolog(y|ize)?|understand|frustrat|disappoint|thank you|appreciate)\b/
  const expectationPattern = /\b(update you|keep you posted|expect|let you know|follow[- ]?up|touch base|next update|loop you in|plan to share|keep you in the loop|will share)\b/

  const clarityMatch = clarityPattern.test(sanitizedText)
  const ownershipMatch = ownershipPattern.test(sanitizedText)
  const empathyMatch = empathyPattern.test(sanitizedText)
  const expectationMatch = expectationPattern.test(sanitizedText)

  const routingTerms = new Set<string>()
  const addRoutingTerm = (value?: string) => {
    if (!value) return
    value
      .split(/[^a-z0-9]+/i)
      .map((term) => term.trim().toLowerCase())
      .forEach((term) => {
        if (term) {
          routingTerms.add(term)
        }
      })
  }

  ;[
    'billing',
    'accounts',
    'invoice',
    'payment',
    'finance',
    'ops',
    'operations',
    'technical',
    'engineering',
    'support',
    'platform',
    'panel',
    'hosting',
  ].forEach(addRoutingTerm)
  addRoutingTerm(ticket.department)
  addRoutingTerm(scenario?.bucket)
  scenario?.tags?.forEach(addRoutingTerm)

  const hasRoutingMatch = Array.from(routingTerms).some((term) => sanitizedText.includes(term))

  const routingInsights = buildRoutingInsights(ticket, scenario)
  const statusNormalized = ticket.status.toLowerCase()
  const escalateSignal =
    routingInsights.escalationHeadline === 'Escalation triggered' || statusNormalized.includes('escalated')
  const escalationKeywords = ['escalate', 'handoff', 'tier', 'finance ops', 'escalation', 'transfer', 'step up', 'route to']
  const escalationMentioned = escalationKeywords.some((keyword) => sanitizedText.includes(keyword))

  const closureStatuses = ['solved', 'resolved', 'closed']
  const closureReady = isPostmortemComplete(ticket.postmortem)

  const metrics: ScorecardMetric[] = deEscalationMetricBlueprint.map((definition) => {
    let value = 0
    let note = definition.baseNote
    switch (definition.id) {
      case 'empathy':
        value = empathyMatch ? 10 : 0
        note = empathyMatch
          ? 'Acknowledged frustration or appreciation for their patience.'
          : hasReply
          ? 'Consider mirroring frustration or thanking them for the details.'
          : 'Waiting on the first reply before we can score empathy.'
        break
      case 'clarity':
        value = clarityMatch ? 10 : 0
        note = clarityMatch
          ? 'Outlined next steps, a specific timeline, or ETA.'
          : 'Add clear next steps, a timeline, or ETA so the customer knows what happens next.'
        break
      case 'ownership':
        value = ownershipMatch ? 10 : 0
        note = ownershipMatch
          ? 'Used direct responsibility language (I will, I’m taking point, etc.).'
          : 'Use “I will” or “I’m taking ownership” phrasing before handing off.'
        break
      case 'routing':
        value = hasRoutingMatch ? 10 : 0
        note = hasRoutingMatch
          ? `Tied the reply back to ${scenario?.bucket ?? ticket.department} so routing stays clear.`
          : `Mention Billing/Accounts or Technical Operations terms to justify routing.`
        break
      case 'escalation':
        if (escalateSignal) {
          value = escalationMentioned ? 10 : 0
          note = escalationMentioned
            ? 'Matched the escalation signal with segue language.'
            : 'Escalation triggered; mention the tier, handoff, or finance ops follow-up.'
        } else {
          value = escalationMentioned ? 0 : 10
          note = escalationMentioned
            ? 'No escalation signal; avoid unnecessary tier talk.'
            : 'Correctly kept this reply at the current tier.'
        }
        break
      case 'expectation':
        value = expectationMatch ? 10 : 0
        note = expectationMatch
          ? 'Promised a follow-up, update, or checkpoint.'
          : 'Set expectations for when the next update will arrive.'
        break
      case 'closure':
        value = closureStatuses.includes(statusNormalized) && closureReady ? 10 : 0
        if (closureStatuses.includes(statusNormalized)) {
          note = closureReady
            ? 'Full postmortem (root cause, fix, follow-up, prevention, KB capture) is documented before solving.'
            : 'Penalty: finish the postmortem checklist, including the KB capture question, before closing.'
        } else {
          note = 'Ticket is still open; fill these fields when wrapping up.'
        }
        break
      default:
        note = definition.baseNote
    }
    return {
      id: definition.id,
      label: definition.label,
      max: definition.max,
      value: clamp(value, 0, definition.max),
      note,
    }
  })

  const total = metrics.reduce((sum, metric) => sum + metric.value, 0)
  return {
    metrics,
    total,
  }
}
