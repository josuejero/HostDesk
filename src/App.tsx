import { useEffect, useMemo, useState } from 'react'
import { addMinutes, differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns'
import { BookOpenCheck, Clock, Layers, MessageCircle, ShieldAlert, Sparkles } from 'lucide-react'
import clsx from 'clsx'

import { scenarioCatalog, kbArticles, cannedReplies, scoringRubric } from './data'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type { Audience, DemoState, KBArticle, ScenarioSeed, Ticket, ThreadEntry } from './types'
import './App.css'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const cloneTicket = (ticket: Ticket) => JSON.parse(JSON.stringify(ticket)) as Ticket

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

  const scenarioMap = useMemo(() => {
    const map = new Map<string, ScenarioSeed>()
    scenarioCatalog.forEach((scenario) => map.set(scenario.ticket.id, scenario))
    return map
  }, [])

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
    addThreadEntry(draftReply, draftAudience)
  }

  const handleUseCannedReply = (replyId: string, body: string) => {
    setSelectedReplyId(replyId)
    setDraftReply(body)
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
                  <div className="panel">
                    <div className="panel-heading">
                      <MessageCircle size={18} />
                      <h3>Threaded communication</h3>
                    </div>
                    <div className="panel-body">
                      {selectedTicket.thread.map((entry) => (
                        <div key={entry.id} className="thread-entry customer">
                          <div className="thread-meta">
                            <strong>{entry.author}</strong>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                          <p>{entry.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel">
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
                      <h3>Canned replies</h3>
                    </div>
                    <div className="panel-body canned">
                      {cannedReplies.map((reply) => (
                        <button
                          key={reply.id}
                          className={clsx('canned-chip', { active: reply.id === selectedReplyId })}
                          onClick={() => handleUseCannedReply(reply.id, reply.body)}
                        >
                          <span>{reply.title}</span>
                          <small>{reply.tone}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-heading">
                      <BookOpenCheck size={18} />
                      <h3>SLA / KB sidebar</h3>
                    </div>
                    <div className="panel-body">
                      <p className="muted">Toggle between canned replies and the editor below to keep replies human.</p>
                      <label>
                        <span>Audience</span>
                        <select value={draftAudience} onChange={(event) => setDraftAudience(event.target.value as Audience)}>
                          <option value="customer">Customer-facing</option>
                          <option value="internal">Internal note</option>
                        </select>
                      </label>
                      <label>
                        <span>Compose reply</span>
                        <textarea value={draftReply} onChange={(event) => setDraftReply(event.target.value)} rows={4} />
                      </label>
                      <button className="primary" onClick={handleSendReply}>
                        Send reply
                      </button>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-heading">
                      <BookOpenCheck size={18} />
                      <h3>KB suggestions</h3>
                    </div>
                    <div className="panel-body kb-suggestions">
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
