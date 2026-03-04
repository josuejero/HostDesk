import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { scenarioCatalog, kbArticles, cannedReplies } from '../../data'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { getInitialState } from '../utils/helpers'
import { queueViews } from '../constants/queueViews'
import { cannedCategoryLabels, cannedCategoryOrder, formatCannedText } from '../constants/cannedReplies'
import { subjectTriggers, type GuidedEntry } from '../constants/subjectTriggers'
import { getCountdownLabel, getTimerStatus, timerStatusDescriptions } from '../utils/timer'
import {
  applyScoreDelta,
  deEscalationMaxTotal,
  evaluateDeEscalationScore,
  refreshClosureScore,
} from '../utils/scorecard'
import { postmortemFieldLabels, postmortemNarrativeFields, isPostmortemComplete } from '../utils/postmortem'
import { buildRoutingInsights, type RoutingInsights } from '../utils/routing'
import type {
  Audience,
  CannedReply,
  CannedReplyCategory,
  KBArticle,
  ScenarioSeed,
  Ticket,
} from '../../types'

export const useDeskState = () => {
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
    const sortedTickets = [...ticketsInView].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

  const routingInsights = useMemo<RoutingInsights | null>(() => {
    if (!selectedTicket) return null
    return buildRoutingInsights(selectedTicket, selectedScenario)
  }, [selectedTicket, selectedScenario])

  const selectedCountdownLabel = selectedTicket ? getCountdownLabel(selectedTicket) : ''
  const selectedTimerStatus = selectedTicket ? getTimerStatus(selectedTicket) : 'normal'
  const selectedTimerDescription = timerStatusDescriptions[selectedTimerStatus]
  const deEscalationScorecard = useMemo(
    () => (selectedTicket ? evaluateDeEscalationScore(selectedTicket, selectedScenario) : null),
    [selectedTicket, selectedScenario],
  )

  const jumpTargetId = selectedTicket?.id ?? state.tickets[0]?.id ?? ''

  const kbText = useMemo(() => {
    if (!selectedTicket) return ''
    return [selectedTicket.subject, ...selectedTicket.thread.map((entry) => entry.message)].join(' ').toLowerCase()
  }, [selectedTicket])

  const kbSuggestions = useMemo(() => {
    if (!selectedTicket) return []
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

  const subjectText = selectedTicket?.subject.toLowerCase() ?? ''

  const guidedTroubleshooting = useMemo(() => {
    if (!subjectText) return []
    return subjectTriggers
      .map((trigger) => {
        const triggered = trigger.keywords.some((keyword) => subjectText.includes(keyword))
        if (!triggered) return null
        const matches = kbArticles.filter((article) =>
          article.labels?.some((label) => trigger.articleLabels.includes(label)),
        )
        if (!matches.length) return null
        return { ...trigger, articles: matches }
      })
      .filter((entry): entry is GuidedEntry => Boolean(entry))
  }, [subjectText])

  const postmortemChecklist = useMemo(() => {
    if (!selectedTicket) return []
    const { postmortem } = selectedTicket
    const narrativeItems = postmortemNarrativeFields.map((field) => ({
      id: field,
      label: postmortemFieldLabels[field],
      complete: postmortem[field].trim().length > 0,
      detail: postmortem[field].trim().length > 0 ? 'Documented' : 'Required before closing',
    }))
    const knowledgeComplete = postmortem.knowledgeArticleStatus.trim().length > 0
    const knowledgeDetail = knowledgeComplete
      ? postmortem.knowledgeArticleStatus === 'yes'
        ? 'Yes – KB work logged'
        : 'No – KB update skipped'
      : 'Pending answer'
    return [
      ...narrativeItems,
      {
        id: 'knowledge',
        label: 'Article created or updated?',
        complete: knowledgeComplete,
        detail: knowledgeDetail,
      },
    ]
  }, [selectedTicket])

  const caseCloseReady = Boolean(selectedTicket && isPostmortemComplete(selectedTicket.postmortem))

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
    if (!selectedTicket || !message.trim()) return
    const entry = {
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
    if (!draftReply.trim()) return
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
    if (!reply) return
    setSelectedReplyId(reply.id)
    setDraftReply(formatCannedText(reply))
  }

  const handleShareSelectedArticle = () => {
    if (!selectedArticleId) return
    const article = kbSuggestions.find((item) => item.id === selectedArticleId)
    if (!article) return
    handleShareKB(article)
    setToastMessage(`Shared KB article "${article.title}" with the thread.`)
  }

  const handleShareKB = (article: KBArticle) => {
    if (!selectedTicket) return
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
    if (!selectedTicket) return
    if (action === 'solved' && !caseCloseReady) {
      setToastMessage('Finish the postmortem checklist, including the KB capture question, before closing this ticket.')
      return
    }
    const config = statusActionConfig[action]
    updateTicket(selectedTicket.id, (ticket) => ({ ...ticket, status: config.status }))
    addThreadEntry(config.message, 'customer')
    setToastMessage(`${config.label} action queued.`)
  }

  const handlePostmortemChange = (field: keyof Ticket['postmortem'], value: string) => {
    if (!selectedTicket) return
    updateTicket(selectedTicket.id, (ticket) => {
      const updatedPostmortem = { ...ticket.postmortem, [field]: value }
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

  const handleWalkthroughKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      handleToggleWalkthrough()
    }
  }

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 3800)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  return {
    scenarioCatalog,
    queueViews,
    viewCounts,
    activeView,
    selectedViewId,
    setSelectedViewId,
    filteredTickets,
    jumpTargetId,
    searchTerm,
    setSearchTerm,
    scenarioMap,
    handleSelectTicket,
    handleToggleScenarioLibrary,
    handleToggleWalkthrough,
    showScenarioLibrary: state.showScenarioLibrary,
    walkthroughActive: state.walkthroughActive,
    selectedTicket,
    selectedScenario,
    routingInsights,
    selectedCountdownLabel,
    selectedTimerStatus,
    selectedTimerDescription,
    deEscalationScorecard,
    deEscalationMaxTotal,
    selectedReplyId,
    draftReply,
    setDraftReply,
    draftAudience,
    setDraftAudience,
    selectedCannedReply,
    cannedRepliesByCategory,
    cannedCategoryLabels,
    cannedCategoryOrder,
    requiresCannedEdit,
    setSelectedReplyId,
    handleSendReply,
    handleUseCannedReply,
    selectedArticleId,
    setSelectedArticleId,
    kbSuggestions,
    handleShareSelectedArticle,
    handleShareKB,
    handleStatusAction,
    postmortemNarrativeFields,
    postmortemFieldLabels,
    handlePostmortemChange,
    postmortemChecklist,
    guidedTroubleshooting,
    caseCloseReady,
    toastMessage,
    setToastMessage,
    handleReset,
    handleWalkthroughKeyDown,
  }
}
