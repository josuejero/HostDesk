import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { cannedReplies, kbArticles, scenarioCatalog } from '../../data'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import type {
  ActivityChannel,
  ActivityEntry,
  ActivityType,
  AiSuggestion,
  AiSuggestionKind,
  LeadStage,
  OutreachTemplate,
  OutreachTemplateCategory,
  PlaybookArticle,
  PlaybookStatus,
  ProspectRecord,
  ScenarioSeed,
} from '../../types'
import { cannedCategoryLabels, cannedCategoryOrder, formatCannedText } from '../constants/cannedReplies'
import { queueViews } from '../constants/queueViews'
import { subjectTriggers, type GuidedEntry } from '../constants/subjectTriggers'
import { getInitialState, isResearchActivity } from '../utils/helpers'
import { reviewFieldLabels, reviewNarrativeFields } from '../utils/postmortem'
import {
  buildRoutingInsights,
  canMoveToStage,
  getMicrosoftMotion,
  hasDatedNextStep,
  hasOutboundActivity,
  isRecordStale,
  type RoutingInsights,
} from '../utils/routing'
import { buildOperationalScorecard, evaluateExecutionScore, executionMaxTotal } from '../utils/scorecard'
import { getCountdownLabel, getTimerStatus, timerStatusDescriptions } from '../utils/timer'
import { buildAiSuggestion } from '../utils/aiAssist'

const activityTypeLabels: Record<ActivityType, string> = {
  'outbound-email': 'Outbound email',
  'call-attempt': 'Call attempt',
  'linkedin-touch': 'LinkedIn touch',
  'reply-received': 'Reply received',
  'meeting-booked': 'Meeting booked',
  'enrichment-update': 'Enrichment update',
  'ownership-changed': 'Ownership changed',
  'stage-changed': 'Stage changed',
  'ai-draft-used': 'AI draft used',
  'note-added': 'Note added',
}

const activityChannelMap: Record<ActivityType, ActivityChannel> = {
  'outbound-email': 'email',
  'call-attempt': 'call',
  'linkedin-touch': 'linkedin',
  'reply-received': 'email',
  'meeting-booked': 'meeting',
  'enrichment-update': 'crm',
  'ownership-changed': 'crm',
  'stage-changed': 'crm',
  'ai-draft-used': 'internal',
  'note-added': 'internal',
}

const stageOptions: LeadStage[] = ['New lead', 'Active', 'Meeting booked', 'Handoff ready', 'Nurture', 'Disqualified']

const countFilled = (values: Array<string | string[]>) =>
  values.filter((value) => (Array.isArray(value) ? value.length > 0 : value.trim().length > 0)).length

const computeCrmCompleteness = (record: ProspectRecord) => {
  const completed = countFilled([
    record.company,
    record.segment,
    record.employeeRange,
    record.microsoftFootprint,
    record.useCase,
    record.buyerPersona,
    record.leadSource,
    record.owner,
    record.painPoints,
    record.buyingSignals,
    record.nextTouchDueAt,
    record.stage === 'Disqualified' ? record.disqualificationReason : 'n/a',
  ])

  return Math.round(completed / 12 * 100)
}

const toDatetimeLocalValue = (value: string) => (value ? value.slice(0, 16) : '')

const toIso = (value: string) => (value ? new Date(value).toISOString() : '')

const shouldAdvanceLastTouch = (type: ActivityType) =>
  ['outbound-email', 'call-attempt', 'linkedin-touch', 'reply-received', 'meeting-booked', 'note-added'].includes(type)

const defaultOutcomeForType = (type: ActivityType) => {
  switch (type) {
    case 'outbound-email':
      return 'Delivered'
    case 'call-attempt':
      return 'Completed'
    case 'linkedin-touch':
      return 'Sent'
    case 'reply-received':
      return 'Received'
    case 'meeting-booked':
      return 'Confirmed'
    case 'enrichment-update':
      return 'Updated'
    case 'ownership-changed':
      return 'Reassigned'
    case 'stage-changed':
      return 'Moved'
    case 'ai-draft-used':
      return 'Applied'
    default:
      return 'Captured'
  }
}

const dedupePlaybooks = (articles: PlaybookArticle[]) => {
  const seen = new Set<string>()
  return articles.filter((article) => {
    if (seen.has(article.id)) {
      return false
    }
    seen.add(article.id)
    return true
  })
}

export const useDeskState = () => {
  const [state, setState, resetState] = useLocalStorageState('hostdesk-sales-ops-v1', getInitialState)
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null)
  const [draftReply, setDraftReply] = useState('')
  const [draftActivityType, setDraftActivityType] = useState<ActivityType>('outbound-email')
  const [draftOutcome, setDraftOutcome] = useState('')
  const [draftNextStep, setDraftNextStep] = useState('')
  const [draftNextTouchDueAt, setDraftNextTouchDueAt] = useState('')
  const [draftCrmUpdated, setDraftCrmUpdated] = useState(true)
  const [selectedStage, setSelectedStage] = useState<LeadStage>(scenarioCatalog[0]?.record.stage ?? 'New lead')
  const [manualSelectedArticleId, setManualSelectedArticleId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedViewId, setSelectedViewId] = useState(queueViews[0]?.id ?? 'new-leads')
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)

  const scenarioMap = useMemo(() => {
    const map = new Map<string, ScenarioSeed>()
    scenarioCatalog.forEach((scenario) => map.set(scenario.record.id, scenario))
    return map
  }, [])

  const rehydrateRecord = (record: ProspectRecord) => {
    const scenario = scenarioMap.get(record.id)
    const crmCompleteness = computeCrmCompleteness(record)
    const hydrated = { ...record, crmCompleteness }
    return {
      ...hydrated,
      scorecard: buildOperationalScorecard(hydrated, scenario),
    }
  }

  const selectedRecord = state.records.find((record) => record.id === state.selectedRecordId) ?? state.records[0]
  const selectedScenario = selectedRecord ? scenarioMap.get(selectedRecord.id) : undefined

  const cannedRepliesByCategory = useMemo(() => {
    const grouped = cannedCategoryOrder.reduce<Record<OutreachTemplateCategory, OutreachTemplate[]>>((acc, category) => {
      acc[category] = []
      return acc
    }, {} as Record<OutreachTemplateCategory, OutreachTemplate[]>)
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
      counts[view.id] = state.records.filter((record) => view.filter(record, scenarioMap.get(record.id))).length
    })
    return counts
  }, [state.records, scenarioMap])

  const activeView = queueViews.find((view) => view.id === selectedViewId) ?? queueViews[0]

  const recordsInView = useMemo(() => {
    if (!activeView) {
      return state.records
    }

    return state.records.filter((record) => activeView.filter(record, scenarioMap.get(record.id)))
  }, [activeView, state.records, scenarioMap])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const sortedRecords = [...recordsInView].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )

    if (!normalizedSearch) {
      return sortedRecords
    }

    return sortedRecords.filter((record) => {
      const scenario = scenarioMap.get(record.id)
      const searchable = [
        record.subject,
        record.company,
        record.segment,
        record.useCase,
        record.stage,
        record.owner,
        record.buyerPersona,
        scenario?.bucket,
        getMicrosoftMotion(record, scenario),
        ...(scenario?.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchable.includes(normalizedSearch)
    })
  }, [recordsInView, scenarioMap, searchTerm])

  const routingInsights = useMemo<RoutingInsights | null>(() => {
    if (!selectedRecord) return null
    return buildRoutingInsights(selectedRecord, selectedScenario)
  }, [selectedRecord, selectedScenario])

  const selectedCountdownLabel = selectedRecord ? getCountdownLabel(selectedRecord) : ''
  const selectedTimerStatus = selectedRecord ? getTimerStatus(selectedRecord) : 'normal'
  const selectedTimerDescription = timerStatusDescriptions[selectedTimerStatus]

  const executionScorecard = useMemo(
    () => (selectedRecord ? evaluateExecutionScore(selectedRecord, selectedScenario) : null),
    [selectedRecord, selectedScenario],
  )

  const playbookText = useMemo(() => {
    if (!selectedRecord) return ''
    return [
      selectedRecord.subject,
      selectedRecord.useCase,
      ...selectedRecord.painPoints,
      ...selectedRecord.objections,
      ...selectedRecord.buyingSignals,
      ...selectedRecord.activities.map((activity) => activity.summary),
    ]
      .join(' ')
      .toLowerCase()
  }, [selectedRecord])

  const playbookSuggestions = useMemo(() => {
    if (!selectedRecord) return []

    const explicitMatches = selectedRecord.playbookMatches
      .map((matchId) => kbArticles.find((article) => article.id === matchId))
      .filter((article): article is PlaybookArticle => Boolean(article))

    const keywordMatches = kbArticles.filter((article) =>
      article.keywords.some((keyword) => playbookText.includes(keyword.toLowerCase())),
    )

    return dedupePlaybooks([...explicitMatches, ...keywordMatches]).slice(0, 4)
  }, [playbookText, selectedRecord])

  const selectedArticleId = useMemo(() => {
    if (!playbookSuggestions.length) return null
    if (manualSelectedArticleId && playbookSuggestions.some((article) => article.id === manualSelectedArticleId)) {
      return manualSelectedArticleId
    }
    return playbookSuggestions[0].id
  }, [manualSelectedArticleId, playbookSuggestions])

  const guidedResearch = useMemo(() => {
    if (!selectedRecord) return []

    const subjectText = [selectedRecord.subject, selectedRecord.useCase].join(' ').toLowerCase()

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
  }, [selectedRecord])

  const reviewChecklist = useMemo(() => {
    if (!selectedRecord) return []
    const review = selectedRecord.review
    const narrativeItems = reviewNarrativeFields.map((field) => ({
      id: field,
      label: reviewFieldLabels[field],
      complete: review[field].trim().length > 0,
      detail: review[field].trim().length > 0 ? 'Documented' : 'Still needs review context',
    }))

    const playbookStatus = review.playbookStatus.trim().length > 0
    return [
      ...narrativeItems,
      {
        id: 'playbook-status',
        label: 'Playbook update decision',
        complete: playbookStatus,
        detail: playbookStatus ? `Marked as ${review.playbookStatus}` : 'Select whether a playbook update was needed',
      },
    ]
  }, [selectedRecord])

  const researchActivities = useMemo(
    () => (selectedRecord ? selectedRecord.activities.filter((activity) => isResearchActivity(activity)) : []),
    [selectedRecord],
  )

  const updateRecord = (recordId: string, updater: (record: ProspectRecord) => ProspectRecord) => {
    setState((prev) => ({
      ...prev,
      records: prev.records.map((record) => (record.id === recordId ? rehydrateRecord(updater(record)) : record)),
    }))
  }

  const handleSelectRecord = (recordId: string) => {
    const nextRecord = state.records.find((record) => record.id === recordId)
    setState((prev) => ({ ...prev, selectedRecordId: recordId, showScenarioLibrary: false }))
    setSelectedStage(nextRecord?.stage ?? 'New lead')
    setAiSuggestion(null)
    setDraftNextTouchDueAt('')
  }

  const handleToggleScenarioLibrary = () => {
    setState((prev) => ({ ...prev, showScenarioLibrary: !prev.showScenarioLibrary }))
  }

  const handleToggleWalkthrough = () => {
    setState((prev) => ({ ...prev, walkthroughActive: !prev.walkthroughActive }))
  }

  const logActivity = (activity: ActivityEntry, nextTouchDueAt?: string) => {
    if (!selectedRecord) return

    updateRecord(selectedRecord.id, (record) => ({
      ...record,
      activities: [...record.activities, activity],
      lastTouchAt: shouldAdvanceLastTouch(activity.type) ? activity.timestamp : record.lastTouchAt,
      nextTouchDueAt: nextTouchDueAt ?? record.nextTouchDueAt,
    }))
  }

  const handleLogActivity = () => {
    if (!selectedRecord || !draftReply.trim()) return
    if (requiresCannedEdit) {
      setToastMessage('Edit the outreach template before logging it so the touch feels account-specific.')
      return
    }

    const timestamp = new Date().toISOString()
    const nextTouchDueAt = draftNextTouchDueAt ? toIso(draftNextTouchDueAt) : selectedRecord.nextTouchDueAt
    const activity: ActivityEntry = {
      id: `${draftActivityType}-${Date.now()}`,
      type: draftActivityType,
      owner: selectedRecord.owner.trim() || 'HostDesk SDR',
      timestamp,
      channel: activityChannelMap[draftActivityType],
      outcome: draftOutcome.trim() || defaultOutcomeForType(draftActivityType),
      summary: draftReply.trim(),
      nextStep: draftNextStep.trim() || 'Next step not captured',
      crmUpdated: draftCrmUpdated,
    }

    logActivity(activity, nextTouchDueAt)

    if (draftNextStep.trim()) {
      updateRecord(selectedRecord.id, (record) => ({
        ...record,
        recommendedNextAction: draftNextStep.trim(),
      }))
    }

    setDraftReply('')
    setDraftOutcome('')
    setDraftNextStep('')
    setDraftNextTouchDueAt('')
    setDraftCrmUpdated(true)
    setSelectedReplyId(null)
    setToastMessage(`${activityTypeLabels[draftActivityType]} logged.`)
  }

  const handleUseCannedReply = (replyId: string) => {
    const reply = cannedReplies.find((item) => item.id === replyId)
    if (!reply) return
    setSelectedReplyId(reply.id)
    setDraftReply(formatCannedText(reply))
    setDraftActivityType('outbound-email')
  }

  const handleSharePlaybook = (article: PlaybookArticle) => {
    if (!selectedRecord) return

    const activity: ActivityEntry = {
      id: `note-${Date.now()}`,
      type: 'note-added',
      owner: selectedRecord.owner.trim() || 'HostDesk SDR',
      timestamp: new Date().toISOString(),
      channel: 'internal',
      outcome: 'Playbook surfaced',
      summary: `Matched playbook "${article.title}" for ${article.focusArea}. ${article.summary}`,
      nextStep: selectedRecord.recommendedNextAction || 'Use the playbook to tighten the next touch.',
      crmUpdated: false,
    }

    updateRecord(selectedRecord.id, (record) => ({
      ...record,
      activities: [...record.activities, activity],
      playbookMatches: record.playbookMatches.includes(article.id)
        ? record.playbookMatches
        : [...record.playbookMatches, article.id],
    }))

    setToastMessage(`Added "${article.title}" to the record playbooks.`)
  }

  const handleShareSelectedArticle = () => {
    if (!selectedArticleId) return
    const article = playbookSuggestions.find((item) => item.id === selectedArticleId)
    if (!article) return
    handleSharePlaybook(article)
  }

  const handleRecordFieldChange = (
    field: 'owner' | 'buyerPersona' | 'nextTouchDueAt' | 'disqualificationReason',
    value: string,
  ) => {
    if (!selectedRecord) return

    updateRecord(selectedRecord.id, (record) => ({
      ...record,
      [field]: field === 'nextTouchDueAt' ? toIso(value) : value,
    }))
  }

  const handleReviewChange = (
    field: keyof ProspectRecord['review'],
    value: string,
  ) => {
    if (!selectedRecord) return

    updateRecord(selectedRecord.id, (record) => ({
      ...record,
      review: {
        ...record.review,
        [field]: value as PlaybookStatus,
      },
    }))
  }

  const handleApplyStageChange = () => {
    if (!selectedRecord) return

    const pendingRecord = rehydrateRecord({
      ...selectedRecord,
      stage: selectedStage,
    })
    const gate = canMoveToStage(pendingRecord, selectedStage, selectedScenario)
    if (!gate.allowed) {
      setToastMessage(gate.message)
      return
    }

    const timestamp = new Date().toISOString()
    updateRecord(selectedRecord.id, (record) => ({
      ...record,
      stage: selectedStage,
      stageEnteredAt: timestamp,
      activities: [
        ...record.activities,
        {
          id: `stage-${Date.now()}`,
          type: 'stage-changed',
          owner: record.owner.trim() || 'HostDesk SDR',
          timestamp,
          channel: 'crm',
          outcome: `Moved to ${selectedStage}`,
          summary: `Stage moved to ${selectedStage}.`,
          nextStep: record.nextTouchDueAt ? `Next touch remains scheduled for ${new Date(record.nextTouchDueAt).toLocaleString()}.` : 'Next step should be reviewed.',
          crmUpdated: true,
        },
      ],
    }))

    setToastMessage(`${selectedStage} stage applied.`)
  }

  const handleGenerateAiSuggestion = (kind: AiSuggestionKind) => {
    if (!selectedRecord) return
    setAiSuggestion(buildAiSuggestion(kind, selectedRecord, selectedScenario, playbookSuggestions))
  }

  const handleApplyAiSuggestion = () => {
    if (!selectedRecord || !aiSuggestion) return

    const timestamp = new Date().toISOString()

    if (aiSuggestion.kind === 'summary') {
      updateRecord(selectedRecord.id, (record) => ({
        ...record,
        aiSummary: aiSuggestion.body,
        activities: [
          ...record.activities,
          {
            id: `ai-${Date.now()}`,
            type: 'ai-draft-used',
            owner: record.owner.trim() || 'HostDesk SDR',
            timestamp,
            channel: 'internal',
            outcome: 'Summary applied',
            summary: 'Applied AI account summary to the record.',
            nextStep: record.recommendedNextAction || 'Review next-best action.',
            crmUpdated: true,
          },
        ],
      }))
    }

    if (aiSuggestion.kind === 'next-step') {
      updateRecord(selectedRecord.id, (record) => ({
        ...record,
        recommendedNextAction: aiSuggestion.body,
        activities: [
          ...record.activities,
          {
            id: `ai-${Date.now()}`,
            type: 'ai-draft-used',
            owner: record.owner.trim() || 'HostDesk SDR',
            timestamp,
            channel: 'internal',
            outcome: 'Next step applied',
            summary: 'Applied AI next-best-action guidance to the record.',
            nextStep: aiSuggestion.body,
            crmUpdated: true,
          },
        ],
      }))
      setDraftNextStep(aiSuggestion.body)
    }

    if (aiSuggestion.kind === 'draft') {
      setDraftReply(aiSuggestion.body)
      setDraftActivityType('outbound-email')
      logActivity({
        id: `ai-${Date.now()}`,
        type: 'ai-draft-used',
        owner: selectedRecord.owner.trim() || 'HostDesk SDR',
        timestamp,
        channel: 'internal',
        outcome: 'Draft applied',
        summary: 'Applied AI follow-up draft to the activity composer.',
        nextStep: selectedRecord.recommendedNextAction || 'Review and send the personalized draft.',
        crmUpdated: false,
      })
    }

    setAiSuggestion((prev) => (prev ? { ...prev, applied: true } : prev))
    setToastMessage(`${aiSuggestion.headline} applied.`)
  }

  const handleReset = () => {
    resetState()
    setSearchTerm('')
    setSelectedViewId(queueViews[0]?.id ?? 'new-leads')
    setSelectedReplyId(null)
    setDraftReply('')
    setDraftActivityType('outbound-email')
    setDraftOutcome('')
    setDraftNextStep('')
    setDraftNextTouchDueAt('')
    setDraftCrmUpdated(true)
    setSelectedStage(scenarioCatalog[0]?.record.stage ?? 'New lead')
    setAiSuggestion(null)
    setToastMessage('Demo data reset. HostDesk sales-ops scenarios are back to baseline.')
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
    filteredRecords,
    jumpTargetId: selectedRecord?.id ?? state.records[0]?.id ?? '',
    searchTerm,
    setSearchTerm,
    scenarioMap,
    handleSelectRecord,
    handleToggleScenarioLibrary,
    handleToggleWalkthrough,
    showScenarioLibrary: state.showScenarioLibrary,
    walkthroughActive: state.walkthroughActive,
    selectedRecord,
    selectedScenario,
    routingInsights,
    selectedCountdownLabel,
    selectedTimerStatus,
    selectedTimerDescription,
    executionScorecard,
    executionMaxTotal,
    selectedReplyId,
    draftReply,
    setDraftReply,
    draftActivityType,
    setDraftActivityType,
    draftOutcome,
    setDraftOutcome,
    draftNextStep,
    setDraftNextStep,
    draftNextTouchDueAt,
    setDraftNextTouchDueAt,
    draftCrmUpdated,
    setDraftCrmUpdated,
    selectedCannedReply,
    cannedRepliesByCategory,
    cannedCategoryLabels,
    cannedCategoryOrder,
    requiresCannedEdit,
    setSelectedReplyId,
    handleLogActivity,
    handleUseCannedReply,
    selectedArticleId,
    setSelectedArticleId: setManualSelectedArticleId,
    playbookSuggestions,
    handleShareSelectedArticle,
    handleSharePlaybook,
    reviewNarrativeFields,
    reviewFieldLabels,
    handleReviewChange,
    reviewChecklist,
    guidedResearch,
    researchActivities,
    stageOptions,
    selectedStage,
    setSelectedStage,
    handleApplyStageChange,
    handleRecordFieldChange,
    aiSuggestion,
    handleGenerateAiSuggestion,
    handleApplyAiSuggestion,
    toastMessage,
    handleReset,
    handleWalkthroughKeyDown,
    hasOutboundActivity: selectedRecord ? hasOutboundActivity(selectedRecord) : false,
    isRecordStale: selectedRecord ? isRecordStale(selectedRecord) : false,
    nextTouchInputValue: toDatetimeLocalValue(selectedRecord?.nextTouchDueAt ?? ''),
    hasDatedNextStep: selectedRecord ? hasDatedNextStep(selectedRecord) : false,
  }
}
