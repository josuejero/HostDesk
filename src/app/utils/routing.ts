import { addMinutes, differenceInSeconds } from 'date-fns'
import type { ScenarioSeed, Ticket } from '../../types'

export type PanelStatusContext = {
  text: string
  invoiceState: string
}

export type PanelStatusRule = {
  test: (context: PanelStatusContext) => boolean
  label: string
}

export type RoutingInsights = {
  queueLabel: string
  queueReason: string
  slaHeadline: string
  slaMessage: string
  billingHeadline: string
  billingMessage: string
  escalationHeadline: string
  escalationMessage: string
  panelStatus: string
  escalationPath: string
  effectiveSlaMinutes: number
}

const panelStatusRules: PanelStatusRule[] = [
  {
    test: ({ invoiceState }) => invoiceState.includes('suspend'),
    label: 'Panel locked by billing suspension',
  },
  {
    test: ({ text }) => /panel.*loop/.test(text) || /login loop/.test(text),
    label: 'Panel stuck in login loop',
  },
  {
    test: ({ text }) => /(panel|cpanel|control panel).*(down|unavailable|locked|error)/.test(text),
    label: 'Panel reports outage or lockout',
  },
  {
    test: ({ text }) => /(panel|cpanel|control panel)/.test(text),
    label: 'Panel showing alerts',
  },
]

export const getPanelStatus = (ticket: Ticket, scenario?: ScenarioSeed) => {
  const text = [
    ticket.subject,
    ticket.department,
    scenario?.description,
    ...(scenario?.tags ?? []),
    ...ticket.recentIncidents,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const context: PanelStatusContext = {
    text,
    invoiceState: ticket.invoiceState.toLowerCase(),
  }

  const match = panelStatusRules.find((rule) => rule.test(context))
  return match?.label ?? 'Panel appears nominal'
}

export const buildRoutingInsights = (ticket: Ticket, scenario?: ScenarioSeed): RoutingInsights => {
  const lowerText = [
    ticket.subject,
    ticket.department,
    ticket.escalationTier,
    scenario?.description,
    ...(scenario?.tags ?? []),
    ...ticket.recentIncidents,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const isBillingIssue = /billing|invoice|payment|ref(und)?|renewal|charge|accounts|suspend/.test(lowerText)
  const isOutage = /outage|service unavailable|service down|down|unavailable|crash|lag|latency|disconnected/.test(
    lowerText,
  )
  const repeatedFailures = /repeat|repeated|again|multiple|retry|failed|fails/.test(lowerText)

  const slaTarget = addMinutes(new Date(ticket.createdAt), ticket.slaTargetMinutes)
  const remainingSeconds = differenceInSeconds(slaTarget, new Date())
  const slaMissed = remainingSeconds <= 0
  const invoiceStateLower = ticket.invoiceState.toLowerCase()
  const billingSuspended = /suspend|on hold|delinquent|hold/.test(invoiceStateLower)
  const overdueInvoice = slaMissed && billingSuspended

  const planSignal = `${ticket.plan} ${scenario?.customerProfile.planTier ?? ''}`.toLowerCase()
  const planAdjustment = /vip|enterprise/.test(planSignal)
    ? -15
    : /premium/.test(planSignal)
    ? -12
    : /pro/.test(planSignal)
    ? -8
    : 0
  const baseEntitlement = scenario?.customerProfile.slaEntitlementMinutes ?? ticket.slaTargetMinutes
  const effectiveSlaMinutes = Math.max(15, baseEntitlement + planAdjustment)

  const slaHeadline = planAdjustment < 0 ? 'Premium SLA target' : 'Standard SLA target'
  const slaMessage = planAdjustment < 0
    ? `VIP/premium expectation shortens SLA to ${effectiveSlaMinutes}m.`
    : `SLA entitlement stays at ${effectiveSlaMinutes}m.`

  const queueLabel = isBillingIssue ? 'Billing & Accounts' : isOutage ? 'Technical Operations' : ticket.department
  const queueReason = isBillingIssue
    ? 'Billing or invoice signals route the case into the Billing desk.'
    : isOutage
    ? 'Service-unavailable / outage indicators push routing to Technical operations.'
    : 'No special routing flags; follow the assigned department.'

  const path = scenario?.escalationRules.path ?? []
  const currentTier = scenario?.escalationRules.currentTier ?? ticket.escalationTier
  const currentIndex = path.findIndex((tier) => tier === currentTier)
  const nextTier =
    currentIndex >= 0 && currentIndex < path.length - 1
      ? path[currentIndex + 1]
      : path[0] ?? currentTier ?? 'Next tier pending'

  const escalationReason = slaMissed
    ? 'Missed SLA window'
    : repeatedFailures
    ? 'Repeated failures reported'
    : ''
  const escalationHeadline = escalationReason ? 'Escalation triggered' : 'Tier stable'
  const escalationMessage = escalationReason
    ? `Step up to ${nextTier} (${currentTier}) — ${escalationReason.toLowerCase()}.`
    : `Staying on ${currentTier}; monitor SLA and escalations.`

  const billingHeadline = overdueInvoice ? 'Billing urgency: High' : billingSuspended ? 'Billing watch' : 'Billing steady'
  const billingMessage = overdueInvoice
    ? 'Overdue invoice plus suspended service demands urgent billing intervention.'
    : billingSuspended
    ? 'Invoice still shows suspension; validate payment to release the panel.'
    : 'Invoice state is healthy; maintain normal cadence.'

  const escalationPathLabel = path.length ? path.join(' → ') : currentTier ?? 'Escalation path pending'

  return {
    queueLabel,
    queueReason,
    slaHeadline,
    slaMessage,
    billingHeadline,
    billingMessage,
    escalationHeadline,
    escalationMessage,
    panelStatus: getPanelStatus(ticket, scenario),
    escalationPath: escalationPathLabel,
    effectiveSlaMinutes,
  }
}
