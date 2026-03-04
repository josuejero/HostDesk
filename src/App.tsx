import { useEffect, useMemo, useState } from 'react'
import { addMinutes, differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns'
import { BookOpenCheck, Clock, Layers, MessageCircle, ShieldAlert, Sparkles } from 'lucide-react'
import clsx from 'clsx'

import { scenarioCatalog, kbArticles, cannedReplies, scoringRubric } from './data'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type {
  Audience,
  CannedReply,
  CannedReplyCategory,
  DemoState,
  KBArticle,
  ScenarioSeed,
  Ticket,
  ThreadEntry,
} from './types'
import './App.css'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const cloneTicket = (ticket: Ticket) => JSON.parse(JSON.stringify(ticket)) as Ticket

const cannedCategoryOrder: CannedReplyCategory[] = [
  'acknowledgement',
  'billing-clarification',
  'troubleshooting-step-request',
  'outage-acknowledgment',
  'upgrade-reassurance',
  'escalation-handoff',
  'closure-follow-up',
]

const cannedCategoryLabels: Record<CannedReplyCategory, string> = {
  acknowledgement: 'Acknowledgement',
  'billing-clarification': 'Billing clarification',
  'troubleshooting-step-request': 'Troubleshooting step request',
  'outage-acknowledgment': 'Outage acknowledgment',
  'upgrade-reassurance': 'Upgrade reassurance',
  'escalation-handoff': 'Escalation handoff',
  'closure-follow-up': 'Closure / follow-up',
}

const formatCannedText = (reply: CannedReply) =>
  [reply.segments.acknowledgment, reply.segments.ownership, reply.segments.nextStep].join('\n\n')

const isCustomerMessage = (entry: ThreadEntry) =>
  entry.audience === 'customer' && entry.author.toLowerCase().includes('customer')

const getInitialState = (): DemoState => {
  const cloned = scenarioCatalog.map((scenario) => cloneTicket(scenario.ticket))
  return {
    tickets: cloned,
    selectedTicketId: cloned[0]?.id ?? '',
    walkthroughActive: false,
    showScenarioLibrary: false,
  }
}

const getCountdownLabel = (ticket: Ticket) => {
  const created = new Date(ticket.createdAt)
  const target = addMinutes(created, ticket.slaTargetMinutes)
  const secondsRemaining = differenceInSeconds(target, new Date())

  if (secondsRemaining <= 0) {
    const duration = intervalToDuration({ start: target, end: new Date() })
    return `Overdue by ${formatDuration(duration, { format: ['hours', 'minutes'] })}`
  }

  const duration = intervalToDuration({ start: new Date(), end: target })
  return `${formatDuration(duration, { format: ['hours', 'minutes'] })} remaining`
}

type PanelStatusContext = {
  text: string
  invoiceState: string
}

type PanelStatusRule = {
  test: (context: PanelStatusContext) => boolean
  label: string
}

type RoutingInsights = {
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

const getPanelStatus = (ticket: Ticket, scenario?: ScenarioSeed) => {
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

const buildRoutingInsights = (ticket: Ticket, scenario?: ScenarioSeed): RoutingInsights => {
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
  const isOutage = /outage|service unavailable|service down|down|unavailable|crash|lag|latency|disconnected/.test(lowerText)
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

const applyScoreDelta = (
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

const refreshClosureScore = (scorecard: Ticket['scorecard'], postmortem: Ticket['postmortem']) => {
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

type ViewDefinition = {
  id: string
  label: string
  description: string
  filter: (ticket: Ticket, scenario?: ScenarioSeed) => boolean
}

const queueViews: ViewDefinition[] = [
  {
    id: 'open',
    label: 'Open',
    description: 'Fresh incidents that still need a proactive response.',
    filter: (ticket) => ['Open', 'New'].includes(ticket.status),
  },
  {
    id: 'high-priority',
    label: 'High Priority',
    description: 'Critical and urgent work that needs extra focus.',
    filter: (ticket) => ['High', 'Urgent', 'Critical'].includes(ticket.priority) || ticket.severity === 'Critical',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Account, invoice, and suspension cases.',
    filter: (ticket, scenario) => {
      const departmentMatch = ticket.department.toLowerCase().includes('billing') || ticket.department.toLowerCase().includes('accounts')
      const bucketMatch = scenario?.bucket.toLowerCase().includes('billing')
      const tagMatch = scenario?.tags?.some((tag) => tag.toLowerCase().includes('billing'))
      return departmentMatch || bucketMatch || Boolean(tagMatch)
    },
  },
  {
    id: 'technical',
    label: 'Technical',
    description: 'Operations, plugins, and infrastructure incidents.',
    filter: (ticket, scenario) => {
      const departmentMatch = ticket.department.toLowerCase().includes('technical') || ticket.department.toLowerCase().includes('operations')
      const bucketMatch = scenario?.bucket.toLowerCase().includes('technical')
      const tagMatch = scenario?.tags?.some((tag) => /technical|ops|plugin|outage/.test(tag.toLowerCase()))
      return departmentMatch || bucketMatch || Boolean(tagMatch)
    },
  },
  {
    id: 'waiting',
    label: 'Waiting on Customer',
    description: 'Awaiting customer confirmation or follow-up.',
    filter: (ticket) => ticket.status === 'Waiting on Customer',
  },
  {
    id: 'escalated',
    label: 'Escalated',
    description: 'Cases already pushed to higher tiers.',
    filter: (ticket) => ticket.status === 'Escalated',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    description: 'Closed or resolved work ready for documentation.',
    filter: (ticket) => ticket.status.toLowerCase().includes('resolve'),
  },
]

function App() {
  const [state, setState, resetState] = useLocalStorageState('hostdesk-demo-state', getInitialState)
  const [draftReply, setDraftReply] = useState('')
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null)
  const [draftAudience, setDraftAudience] = useState<Audience>('customer')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedViewId, setSelectedViewId] = useState(queueViews[0]?.id ?? 'open')
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)

  const scenarioMap = useMemo(() => {
    const map = new Map<string, ScenarioSeed>()
    scenarioCatalog.forEach((scenario) => map.set(scenario.ticket.id, scenario))
    return map
  }, [])

  const cannedRepliesByCategory = useMemo(() => {
    const grouped = cannedCategoryOrder.reduce<Record<CannedReplyCategory, CannedReply[]>>((acc, category) => {
      acc[category] = []
      return acc
    }, {} as Record<CannedReplyCategory, CannedReply[]>)
    cannedReplies.forEach((reply) => {
      grouped[reply.category].push(reply)
    })
    return grouped
  }, [])

  const selectedCannedReply = useMemo(
    () => (selectedReplyId ? cannedReplies.find((reply) => reply.id === selectedReplyId) ?? null : null),
    [selectedReplyId],
  )

  const cannedBaselineText = selectedCannedReply ? formatCannedText(selectedCannedReply).trim() : ''
  const requiresCannedEdit = Boolean(selectedCannedReply) && draftReply.trim() === cannedBaselineText

  const viewCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    queueViews.forEach((view) => {
      counts[view.id] = state.tickets.filter((ticket) => view.filter(ticket, scenarioMap.get(ticket.id))).length
    })
    return counts
  }, [state.tickets, scenarioMap])

  const activeView = queueViews.find((view) => view.id === selectedViewId) ?? queueViews[0]

  const ticketsInView = useMemo(() => {
    if (!activeView) {
      return state.tickets
    }
    return state.tickets.filter((ticket) => activeView.filter(ticket, scenarioMap.get(ticket.id)))
  }, [activeView, state.tickets, scenarioMap])

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const sortedTickets = [...ticketsInView].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    if (!normalizedSearch) {
      return sortedTickets
    }
    return sortedTickets.filter((ticket) => {
      const scenario = scenarioMap.get(ticket.id)
      const searchable = [
        ticket.subject,
        ticket.department,
        ticket.status,
        ticket.priority,
        ticket.assignedTo,
        scenario?.bucket,
        ...(scenario?.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(normalizedSearch)
    })
  }, [ticketsInView, searchTerm, scenarioMap])

  const selectedTicket = state.tickets.find((ticket) => ticket.id === state.selectedTicketId) ?? state.tickets[0]
  const selectedScenario = selectedTicket ? scenarioMap.get(selectedTicket.id) : undefined
  const routingInsights = useMemo(
    () => (selectedTicket ? buildRoutingInsights(selectedTicket, selectedScenario) : null),
    [selectedTicket, selectedScenario],
  )
  const jumpTargetId = selectedTicket?.id ?? state.tickets[0]?.id ?? ''

  const kbText = useMemo(() => {
    if (!selectedTicket) {
      return ''
    }
    return [selectedTicket.subject, ...selectedTicket.thread.map((entry) => entry.message)].join(' ').toLowerCase()
  }, [selectedTicket])

  const kbSuggestions = useMemo(() => {
    if (!selectedTicket) {
      return []
    }
    const matches = kbArticles.filter((article) =>
      article.keywords.some((keyword) => kbText.includes(keyword.toLowerCase())),
    )
    return matches.slice(0, 3)
  }, [selectedTicket, kbText])

  useEffect(() => {
    if (!kbSuggestions.length) {
      setSelectedArticleId(null)
      return
    }
    setSelectedArticleId((prev) =>
      prev && kbSuggestions.some((article) => article.id === prev) ? prev : kbSuggestions[0].id,
    )
  }, [kbSuggestions])

  const updateTicket = (ticketId: string, updater: (ticket: Ticket) => Ticket) => {
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((ticket) => (ticket.id === ticketId ? updater(ticket) : ticket)),
    }))
  }

  const handleSelectTicket = (ticketId: string) => {
    setState((prev) => ({ ...prev, selectedTicketId: ticketId, showScenarioLibrary: false }))
  }

  const handleToggleScenarioLibrary = () => {
    setState((prev) => ({ ...prev, showScenarioLibrary: !prev.showScenarioLibrary }))
  }

  const handleToggleWalkthrough = () => {
    setState((prev) => ({ ...prev, walkthroughActive: !prev.walkthroughActive }))
  }

  const addThreadEntry = (message: string, audience: Audience) => {
    if (!selectedTicket || !message.trim()) {
      return
    }

    const entry: ThreadEntry = {
      id: `${audience}-${Date.now()}`,
      author: 'You (recruiter)',
      audience,
      createdAt: new Date().toISOString(),
      message: message.trim(),
    }

    updateTicket(selectedTicket.id, (ticket) => {
      const nextThread = audience === 'customer' ? [...ticket.thread, entry] : ticket.thread
      const nextInternal = audience === 'internal' ? [...ticket.internalNotes, entry] : ticket.internalNotes
      let nextScorecard = ticket.scorecard
      nextScorecard = applyScoreDelta(nextScorecard, 'communication', audience === 'customer' ? 2 : 1)
      if (audience === 'internal') {
        nextScorecard = applyScoreDelta(nextScorecard, 'technicalOwnership', 1)
      }
      return {
        ...ticket,
        thread: nextThread,
        internalNotes: nextInternal,
        scorecard: nextScorecard,
      }
    })

    setDraftReply('')
  }

  const handleSendReply = () => {
    if (!draftReply.trim()) {
      return
    }

    if (requiresCannedEdit) {
      setToastMessage('Please personalize the canned reply before sending so it speaks directly to the customer.')
      return
    }

    addThreadEntry(draftReply, draftAudience)
    setDraftReply('')
    setSelectedReplyId(null)
  }

  const handleUseCannedReply = (replyId: string) => {
    const reply = cannedReplies.find((item) => item.id === replyId)
    if (!reply) {
      return
    }
    setSelectedReplyId(reply.id)
    setDraftReply(formatCannedText(reply))
  }

  const handleShareSelectedArticle = () => {
    if (!selectedArticleId) {
      return
    }
    const article = kbSuggestions.find((item) => item.id === selectedArticleId)
    if (!article) {
      return
    }
    handleShareKB(article)
    setToastMessage(`Shared KB article "${article.title}" with the thread.`)
  }

  const handleShareKB = (article: KBArticle) => {
    if (!selectedTicket) {
      return
    }

    const message = `Sharing KB "${article.title}" – ${article.summary}`
    addThreadEntry(message, 'customer')

    updateTicket(selectedTicket.id, (ticket) => {
      const alreadyTagged = ticket.kbMatches.includes(article.id)
      const matches = alreadyTagged ? ticket.kbMatches : [...ticket.kbMatches, article.id]
      let nextScorecard = ticket.scorecard
      nextScorecard = applyScoreDelta(nextScorecard, 'kbSelfService', 3)
      const communicationDelta = ticket.thread.length ? 1 : 0
      if (communicationDelta) {
        nextScorecard = applyScoreDelta(nextScorecard, 'communication', communicationDelta)
      }
      return {
        ...ticket,
        kbMatches: matches,
        scorecard: nextScorecard,
      }
    })
  }

  const statusActionConfig = {
    waiting: {
      label: 'Waiting on customer',
      status: 'Waiting on Customer',
      message: 'I’m marking this case as waiting on customer until we gather the requested logs.',
    },
    solved: {
      label: 'Solved',
      status: 'Solved',
      message: 'The issue is resolved, so I’m moving this ticket to solved; reply if anything else pops up.',
    },
  } as const

  const handleStatusAction = (action: keyof typeof statusActionConfig) => {
    if (!selectedTicket) {
      return
    }
    const config = statusActionConfig[action]
    updateTicket(selectedTicket.id, (ticket) => ({ ...ticket, status: config.status }))
    addThreadEntry(config.message, 'customer')
    setToastMessage(`${config.label} action queued.`)
  }

  const handlePostmortemChange = (field: keyof Ticket['postmortem'], value: string) => {
    if (!selectedTicket) {
      return
    }

    updateTicket(selectedTicket.id, (ticket) => {
      const updatedPostmortem: Ticket['postmortem'] = {
        ...ticket.postmortem,
        [field]: value,
      }
      const refreshed = refreshClosureScore(ticket.scorecard, updatedPostmortem)
      return {
        ...ticket,
        postmortem: updatedPostmortem,
        scorecard: refreshed,
      }
    })
  }

  const handleReset = () => {
    resetState()
    setSearchTerm('')
    setSelectedViewId(queueViews[0]?.id ?? 'open')
    setToastMessage('Demo data reset. Welcome back to square one!')
  }

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timer = window.setTimeout(() => setToastMessage(null), 3800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-copy">
          <p className="eyebrow">HostDesk • hosting + support desk simulator</p>
          <h1>
            Queue operations
            <span>Work like a Zendesk queue built for recruiters.</span>
          </h1>
          <p className="hero-blurb">
            A recruiter-facing console that highlights statuses, departments, tags, and SLA visibility at a glance.
          </p>
        </div>
        <div className="utility-row">
          <label className="utility-field">
            <span>Search the queue</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Subject, department, tag, or assignee"
            />
          </label>
          <label className="utility-field">
            <span>Jump to demo case</span>
            <select value={jumpTargetId} onChange={(event) => handleSelectTicket(event.target.value)}>
              {scenarioCatalog.map((scenario) => (
                <option key={scenario.ticket.id} value={scenario.ticket.id}>
                  {scenario.title} ({scenario.bucket})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="ghost-btn" onClick={handleReset}>
            Reset demo
          </button>
          <button type="button" className="ghost-btn" onClick={handleToggleScenarioLibrary}>
            Browse library
          </button>
          <button type="button" className="ghost-btn" onClick={handleToggleWalkthrough}>
            Recruiter walkthrough
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <nav className="views-nav">
          <div className="views-heading">
            <p className="eyebrow">Views</p>
            <p className="hero-blurb">Statuses, departments, tags, and escalations modeled as queue slices.</p>
          </div>
          <ul className="views-list">
            {queueViews.map((view) => (
              <li key={view.id}>
                <button
                  type="button"
                  className={clsx('view-link', { active: activeView?.id === view.id })}
                  onClick={() => setSelectedViewId(view.id)}
                >
                  <div>
                    <strong>{view.label}</strong>
                    <small>{view.description}</small>
                  </div>
                  <span className="count">{viewCounts[view.id] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="view-footnote">{filteredTickets.length} tickets matching filters</p>
        </nav>

        <section className="tickets-column">
          <div className="tickets-header">
            <div>
              <p className="eyebrow">{activeView?.label ?? 'Queue'}</p>
              <h2>{activeView?.description}</h2>
            </div>
            <p className="hero-blurb ticket-count-cta">
              {filteredTickets.length
                ? `Showing ${filteredTickets.length} ticket${filteredTickets.length > 1 ? 's' : ''}`
                : 'No tickets match this view and search yet.'}
            </p>
          </div>
          <ul className="ticket-list">
            {filteredTickets.length ? (
              filteredTickets.map((ticket) => {
                const scenario = scenarioMap.get(ticket.id)
                const isActive = selectedTicket?.id === ticket.id
                return (
                  <li
                    key={ticket.id}
                    className={clsx('ticket-card', { active: isActive })}
                    onClick={() => handleSelectTicket(ticket.id)}
                  >
                    <div className="ticket-card-top">
                      <div>
                        <h3>{ticket.subject}</h3>
                        <p className="ticket-card-subtext">
                          {ticket.department} • {ticket.priority} priority • {ticket.status}
                        </p>
                      </div>
                      <div className="ticket-card-timer">
                        <Clock size={16} />
                        <span>{getCountdownLabel(ticket)}</span>
                      </div>
                    </div>
                    <div className="ticket-card-meta">
                      <span className="badge dept">{ticket.department}</span>
                      <span
                        className={clsx('badge status', ticket.status.toLowerCase().replace(/\s+/g, '-'))}
                      >
                        {ticket.status}
                      </span>
                      <span className="badge priority">{ticket.priority}</span>
                      <span className="badge severity">{ticket.severity}</span>
                    </div>
                    <div className="tag-row compact">
                      {(scenario?.tags ?? []).map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })
            ) : (
              <li className="empty-state">No tickets match this view and search.</li>
            )}
          </ul>
        </section>

        <section className="detail-column">
          <div className="detail-headline">
            <p className="eyebrow">Case workspace</p>
            <p className="hero-blurb">Open any ticket to reveal threads, scorecard, KB, and postmortem tools.</p>
          </div>
          {selectedTicket ? (
            <section className="ticket-shell">
              <article className="ticket-header">
                <div className="ticket-chip">
                  <span className="badge severity">{selectedTicket.severity}</span>
                  <span className="badge department">{selectedTicket.department}</span>
                  <span className={clsx('badge status', selectedTicket.status.toLowerCase().replace(/\s+/g, '-'))}>
                    {selectedTicket.status}
                  </span>
                </div>
                {routingInsights && (
                  <>
                    <div className="triage-bar">
                      <div className="triage-pill">
                        <span>Severity</span>
                        <strong>{selectedTicket.severity}</strong>
                      </div>
                      <div className="triage-pill">
                        <span>Department</span>
                        <strong>{selectedTicket.department}</strong>
                      </div>
                      <div className="triage-pill">
                        <span>SLA timer</span>
                        <strong className="timer-value">
                          <Clock size={14} />
                          <span>{getCountdownLabel(selectedTicket)}</span>
                        </strong>
                      </div>
                      <div className="triage-pill">
                        <span>Current owner</span>
                        <strong>{selectedTicket.assignedTo}</strong>
                      </div>
                      <div className="triage-pill">
                        <span>Escalation path</span>
                        <strong>{routingInsights.escalationPath}</strong>
                      </div>
                      <div className="triage-pill">
                        <span>Service plan</span>
                        <strong>
                          {selectedTicket.plan}
                          {selectedScenario ? ` • ${selectedScenario.customerProfile.planTier}` : ''}
                        </strong>
                      </div>
                      <div className="triage-pill">
                        <span>Invoice state</span>
                        <strong>{selectedTicket.invoiceState}</strong>
                      </div>
                      <div className="triage-pill">
                        <span>Panel status</span>
                        <strong>{routingInsights.panelStatus}</strong>
                      </div>
                    </div>
                    <div className="routing-grid">
                      <div className="routing-card">
                        <span>Routing queue</span>
                        <strong>{routingInsights.queueLabel}</strong>
                        <p>{routingInsights.queueReason}</p>
                      </div>
                      <div className="routing-card">
                        <span>SLA expectation</span>
                        <strong>{routingInsights.slaHeadline}</strong>
                        <p>{routingInsights.slaMessage}</p>
                      </div>
                      <div className="routing-card">
                        <span>Billing urgency</span>
                        <strong>{routingInsights.billingHeadline}</strong>
                        <p>{routingInsights.billingMessage}</p>
                      </div>
                      <div className="routing-card">
                        <span>Escalation signal</span>
                        <strong>{routingInsights.escalationHeadline}</strong>
                        <p>{routingInsights.escalationMessage}</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="header-row">
                  <h2>{selectedTicket.subject}</h2>
                  <div className="sla">
                    <Clock size={18} />
                    <span>{getCountdownLabel(selectedTicket)}</span>
                  </div>
                </div>
                <div className="metadata">
                  <span>Plan: {selectedTicket.plan}</span>
                  <span>Priority: {selectedTicket.priority}</span>
                  <span>Escalation: {selectedTicket.escalationTier}</span>
                  <span>Assignee: {selectedTicket.assignedTo}</span>
                  <span>Invoice state: {selectedTicket.invoiceState}</span>
                </div>
                <div className="escalation-path">
                  <ShieldAlert size={16} />
                  <span>{selectedScenario?.escalationRules.path.join(' → ') || 'Escalation path unavailable'}</span>
                </div>
                {selectedScenario && (
                  <div className="customer-profile">
                    <Sparkles size={16} />
                    <span>
                      {selectedScenario.customerProfile.name} • {selectedScenario.customerProfile.persona} • {selectedScenario.customerProfile.planTier} • SLA {selectedScenario.customerProfile.slaEntitlementMinutes}m
                    </span>
                  </div>
                )}
              </article>

              <div className="ticket-grid">
                <section className="thread-column">
                  <div className="panel conversation-panel">
                    <div className="panel-heading">
                      <MessageCircle size={18} />
                      <div>
                        <h3>Threaded communication</h3>
                        <p className="muted">Customer messages and agent replies are separated here; attachments remain handy below.</p>
                      </div>
                    </div>
                    <div className="panel-body conversation-body">
                      <div className="conversation-stream">
                        {selectedTicket.thread.map((entry) => {
                          const customerAuthor = isCustomerMessage(entry)
                          return (
                            <div
                              key={entry.id}
                              className={clsx(
                                'conversation-bubble',
                                customerAuthor
                                  ? 'conversation-bubble--customer'
                                  : 'conversation-bubble--agent',
                              )}
                            >
                              <div className="conversation-bubble__meta">
                                <strong>{entry.author}</strong>
                                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                              </div>
                              <p>{entry.message}</p>
                            </div>
                          )
                        })}
                      </div>
                      <div className="attachments-placeholder">
                        <p>Attachments placeholder</p>
                        <small>Drag logs, screenshots, or recordings here once attachments are enabled.</small>
                      </div>
                      <div className="status-actions">
                        <button type="button" className="ghost-btn" onClick={() => handleStatusAction('waiting')}>
                          Waiting on customer
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => handleStatusAction('solved')}>
                          Solved
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="panel composer-panel">
                    <div className="panel-heading">
                      <MessageCircle size={18} />
                      <h3>Reply composer</h3>
                    </div>
                    <div className="panel-body composer-body">
                      <label className="utility-field">
                        <span>Canned replies</span>
                        <select
                          value={selectedReplyId ?? ''}
                          onChange={(event) => {
                            const value = event.target.value
                            if (value) {
                              handleUseCannedReply(value)
                              return
                            }
                            setSelectedReplyId(null)
                          }}
                        >
                          <option value="">Start from scratch</option>
                          {cannedCategoryOrder.map((category) => (
                            <optgroup key={category} label={cannedCategoryLabels[category]}>
                              {cannedRepliesByCategory[category].map((reply) => (
                                <option key={reply.id} value={reply.id}>
                                  {reply.title} ({reply.tone})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                      {selectedCannedReply && (
                        <div className="canned-preview">
                          <div>
                            <strong>Acknowledgment</strong>
                            <p>{selectedCannedReply.segments.acknowledgment}</p>
                          </div>
                          <div>
                            <strong>Ownership</strong>
                            <p>{selectedCannedReply.segments.ownership}</p>
                          </div>
                          <div>
                            <strong>Next step</strong>
                            <p>{selectedCannedReply.segments.nextStep}</p>
                          </div>
                        </div>
                      )}
                      <label className="utility-field">
                        <span>Audience</span>
                        <select value={draftAudience} onChange={(event) => setDraftAudience(event.target.value as Audience)}>
                          <option value="customer">Customer-facing</option>
                          <option value="internal">Internal note</option>
                        </select>
                      </label>
                      <label className="utility-field">
                        <span>Compose reply</span>
                        <textarea value={draftReply} onChange={(event) => setDraftReply(event.target.value)} rows={4} />
                      </label>
                      {requiresCannedEdit && (
                        <p className="muted composer-reminder">
                          Edit the canned response so it feels personalized, empathetic, and clear about next steps.
                        </p>
                      )}
                      <div className="composer-controls">
                        <div className="kb-share-row">
                          <select
                            value={selectedArticleId ?? ''}
                            onChange={(event) => setSelectedArticleId(event.target.value || null)}
                            disabled={!kbSuggestions.length}
                          >
                            {kbSuggestions.length ? (
                              kbSuggestions.map((article) => (
                                <option key={article.id} value={article.id}>
                                  {article.title}
                                </option>
                              ))
                            ) : (
                              <option value="">No articles yet</option>
                            )}
                          </select>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={handleShareSelectedArticle}
                            disabled={!selectedArticleId}
                          >
                            Share article
                          </button>
                        </div>
                        <button
                          type="button"
                          className="primary"
                          onClick={handleSendReply}
                          disabled={!draftReply.trim() || requiresCannedEdit}
                        >
                          Send reply
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="panel internal-notes-panel">
                    <div className="panel-heading">
                      <MessageCircle size={18} />
                      <h3>Internal notes</h3>
                    </div>
                    <div className="panel-body">
                      {selectedTicket.internalNotes.map((note) => (
                        <div key={note.id} className="thread-entry internal">
                          <div className="thread-meta">
                            <strong>{note.author}</strong>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p>{note.message}</p>
                        </div>
                      ))}
                      {!selectedTicket.internalNotes.length && <p className="muted">No private notes yet.</p>}
                    </div>
                  </div>
                </section>

                <aside className="sidebar">
                  <div className="panel">
                    <div className="panel-heading">
                      <BookOpenCheck size={18} />
                      <h3>Scorecard ({scoringRubric.focus})</h3>
                    </div>
                    <div className="panel-body scorecard">
                      {selectedTicket.scorecard.metrics.map((metric) => {
                        const rubricMetric = scoringRubric.metrics.find((m) => m.id === metric.id)
                        return (
                          <div key={metric.id} className="score-metric">
                            <div>
                              <strong>{metric.label}</strong>
                              <span>
                                {metric.value}/{metric.max}
                              </span>
                            </div>
                            <p className="note">{metric.note}</p>
                            {rubricMetric && <p className="suggestion">{rubricMetric.suggestion}</p>}
                            <div className="meter">
                              <div style={{ width: `${(metric.value / metric.max) * 100}%` }} />
                            </div>
                          </div>
                        )
                      })}
                      <div className="total">Total {selectedTicket.scorecard.total}/100</div>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-heading">
                      <BookOpenCheck size={18} />
                      <h3>Postmortem</h3>
                    </div>
                    <div className="panel-body postmortem">
                      {(['rootCause', 'fix', 'followUp', 'prevention'] as const).map((field) => (
                        <label key={field}>
                          <span>{field === 'rootCause' ? 'Root cause' : field === 'fix' ? 'Fix' : field === 'followUp' ? 'Follow-up' : 'Prevention'}</span>
                          <textarea
                            value={selectedTicket.postmortem[field]}
                            onChange={(event) => handlePostmortemChange(field, event.target.value)}
                            rows={2}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-heading">
                      <BookOpenCheck size={18} />
                      <h3>KB suggestions</h3>
                    </div>
                    <div className="panel-body kb-suggestions">
                      <p className="muted">
                        Share directly from the composer above or with the buttons here.
                      </p>
                      {kbSuggestions.length ? (
                        kbSuggestions.map((article) => (
                          <div key={article.id} className="kb-article">
                            <div>
                              <strong>{article.title}</strong>
                              <p>{article.summary}</p>
                              <small>{article.keywords.join(', ')}</small>
                            </div>
                            <button onClick={() => handleShareKB(article)}>Share KB</button>
                          </div>
                        ))
                      ) : (
                        <p className="muted">No keyword matches yet. Keep adding details to the thread.</p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          ) : (
            <div className="detail-empty">
              <p>Select a ticket from the queue to load the workspace.</p>
            </div>
          )}
        </section>
      </div>

      {state.showScenarioLibrary && (
        <section className="scenario-library">
          <div className="panel panel--flat">
            <div className="panel-heading">
              <Layers size={18} />
              <h3>Scenario catalog</h3>
            </div>
            <div className="panel-body scenario-grid">
              {scenarioCatalog.map((scenario) => (
                <article key={scenario.id} className="scenario-card">
                  <div>
                    <p className="badge bucket">{scenario.bucket}</p>
                    <h4>{scenario.title}</h4>
                    <p>{scenario.description}</p>
                  </div>
                  <div className="scenario-meta">
                    <p>Plan Tier: {scenario.ticket.plan}</p>
                    <p>Status: {scenario.ticket.status}</p>
                    <p>Severity: {scenario.ticket.severity}</p>
                    <div className="tag-row">
                      {scenario.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button onClick={() => handleSelectTicket(scenario.ticket.id)}>Jump into this scenario</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {state.walkthroughActive && selectedScenario && (
        <div className="walkthrough-overlay">
          <div className="walkthrough-card">
            <h3>Recruiter walkthrough</h3>
            <p>{selectedScenario.description}</p>
            <ul>
              <li>Check SLA timer: {selectedTicket && selectedTicket.slaTargetMinutes} minutes from {new Date(selectedTicket?.createdAt || 0).toLocaleTimeString()}.</li>
              <li>Refer to KB suggestions and canned replies before replying; keep tone human.</li>
              <li>Notice how scorecard ties to SLA, empathy, and KB usage.</li>
              <li>Postmortem fields ensure closure discipline (root cause, fix, follow-up, prevention).</li>
            </ul>
            <button onClick={handleToggleWalkthrough}>Finish walkthrough</button>
          </div>
        </div>
      )}

      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  )
}

export default App
