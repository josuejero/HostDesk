import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { cannedReplies, kbArticles, scenarioCatalog } from '../../data'
import { useLocalStorageState } from '../../hooks/useLocalStorageState'
import { adaptProspectDetail, adaptProspectSummary, scenarioByExternalKey, upsertSummary } from '../../api/adapters'
import { apiFetch, ApiClientError } from '../../api/client'
import { useProspect, useProspects } from '../../api/hooks'
import type {
  ActivityType,
  AiSuggestion,
  AiSuggestionKind,
  LeadStage,
  OutreachTemplate,
  OutreachTemplateCategory,
  PlaybookArticle,
  PlaybookStatus,
  ProspectDetail,
  ProspectRecord,
  ProspectSummary,
  ScenarioSeed,
  SessionState,
} from '../../types'
import { cannedCategoryLabels, cannedCategoryOrder, formatCannedText } from '../constants/cannedReplies'
import { queueViews } from '../constants/queueViews'
import { subjectTriggers, type GuidedEntry } from '../constants/subjectTriggers'
import { isResearchActivity } from '../utils/helpers'
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
import { evaluateExecutionScore, executionMaxTotal } from '../utils/scorecard'
import { getCountdownLabel, getTimerStatus, timerStatusDescriptions } from '../utils/timer'
import { buildAiSuggestion } from '../utils/aiAssist'

const fallbackSession: SessionState = {
  authenticated: true,
  user: {
    id: '1',
    email: 'demo@hostdesk.local',
    displayName: 'HostDesk Demo',
    createdAt: '2026-03-01T00:00:00.000Z',
    lastLoginAt: '2026-03-29T12:00:00.000Z',
  },
  csrfToken: 'test-csrf-token',
}

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

const stageOptions: LeadStage[] = ['New lead', 'Active', 'Meeting booked', 'Handoff ready', 'Nurture', 'Disqualified']

const countFilled = (values: Array<string | string[]>) =>
  values.filter((value) => (Array.isArray(value) ? value.length > 0 : value.trim().length > 0)).length

const computeCrmCompleteness = (record: Pick<
  ProspectRecord,
  | 'company'
  | 'segment'
  | 'employeeRange'
  | 'microsoftFootprint'
  | 'useCase'
  | 'buyerPersona'
  | 'leadSource'
  | 'owner'
  | 'painPoints'
  | 'buyingSignals'
  | 'nextTouchDueAt'
  | 'stage'
  | 'disqualificationReason'
>) => {
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

  return Math.round((completed / 12) * 100)
}

const toDatetimeLocalValue = (value: string) => (value ? value.slice(0, 16) : '')

const toIso = (value: string) => (value ? new Date(value).toISOString() : '')

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

const toSummary = (detail: ProspectDetail): ProspectSummary => ({
  id: detail.id,
  externalKey: detail.externalKey,
  subject: detail.subject,
  company: detail.company,
  segment: detail.segment,
  employeeRange: detail.employeeRange,
  microsoftFootprint: [...detail.microsoftFootprint],
  useCase: detail.useCase,
  buyerPersona: detail.buyerPersona,
  leadSource: detail.leadSource,
  owner: detail.owner,
  stage: detail.stage,
  stageEnteredAt: detail.stageEnteredAt,
  createdAt: detail.createdAt,
  lastTouchAt: detail.lastTouchAt,
  nextTouchDueAt: detail.nextTouchDueAt,
  painPoints: [...detail.painPoints],
  objections: [...detail.objections],
  buyingSignals: [...detail.buyingSignals],
  playbookMatches: [...detail.playbookMatches],
  review: { ...detail.review },
  aiSummary: detail.aiSummary,
  recommendedNextAction: detail.recommendedNextAction,
  crmCompleteness: detail.crmCompleteness,
  disqualificationReason: detail.disqualificationReason,
})

const deriveApiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiClientError ? error.message : error instanceof Error ? error.message : fallback

export const useDeskState = (session: SessionState = fallbackSession) => {
  const [selectedViewId, setSelectedViewId] = useLocalStorageState('hostdesk-ui-selected-view', () => queueViews[0]?.id ?? 'new-leads')
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null)
  const [draftReply, setDraftReply] = useState('')
  const [draftActivityType, setDraftActivityType] = useState<ActivityType>('outbound-email')
  const [draftOutcome, setDraftOutcome] = useState('')
  const [draftNextStep, setDraftNextStep] = useState('')
  const [draftNextTouchDueAt, setDraftNextTouchDueAt] = useState('')
  const [draftCrmUpdated, setDraftCrmUpdated] = useState(true)
  const [selectedStageState, setSelectedStageState] = useState<LeadStage>('New lead')
  const [stageSelectionRecordId, setStageSelectionRecordId] = useState<string>('')
  const [manualSelectedArticleId, setManualSelectedArticleId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<string>('')
  const [showScenarioLibrary, setShowScenarioLibrary] = useState(false)
  const [walkthroughActive, setWalkthroughActive] = useState(false)

  const reviewSaveTimerRef = useRef<number | null>(null)
  const reviewSavePayloadRef = useRef<Record<string, string>>({})
  const ownershipSaveTimerRef = useRef<number | null>(null)
  const ownershipSavePayloadRef = useRef<Record<string, string>>({})

  const {
    prospects,
    setProspects,
    isLoading: prospectsLoading,
    error: prospectsError,
    refresh: refreshProspects,
  } = useProspects(session.authenticated)

  const summaryRecords = useMemo(() => prospects.map(adaptProspectSummary), [prospects])

  const effectiveSelectedRecordId =
    selectedRecordId && summaryRecords.some((record) => record.id === selectedRecordId)
      ? selectedRecordId
      : summaryRecords[0]?.id ?? ''

  const selectedSummaryRecord = summaryRecords.find((record) => record.id === effectiveSelectedRecordId) ?? summaryRecords[0]
  const selectedPersistedId = selectedSummaryRecord?.persistedId ?? null

  const {
    prospect: selectedProspectDetail,
    setProspect: setSelectedProspectDetail,
    isLoading: selectedRecordLoading,
    error: selectedRecordError,
    refresh: refreshSelectedProspect,
  } = useProspect(selectedPersistedId, session.authenticated)

  const selectedRecord = useMemo(() => {
    if (selectedProspectDetail && selectedSummaryRecord && selectedProspectDetail.id === selectedSummaryRecord.persistedId) {
      return adaptProspectDetail(selectedProspectDetail)
    }

    return selectedSummaryRecord
  }, [selectedProspectDetail, selectedSummaryRecord])

  const selectedScenario = selectedRecord
    ? scenarioByExternalKey.get(selectedRecord.externalKey ?? selectedRecord.id)
    : undefined

  const scenarioMap = useMemo(() => {
    const map = new Map<string, ScenarioSeed>()
    scenarioCatalog.forEach((scenario) => map.set(scenario.record.id, scenario))
    return map
  }, [])

  useEffect(() => {
    return () => {
      if (reviewSaveTimerRef.current) {
        window.clearTimeout(reviewSaveTimerRef.current)
      }
      if (ownershipSaveTimerRef.current) {
        window.clearTimeout(ownershipSaveTimerRef.current)
      }
    }
  }, [])

  const syncDetail = (detail: ProspectDetail) => {
    setSelectedProspectDetail(detail)
    setProspects((prev) => upsertSummary(prev, toSummary(detail)))
  }

  const applyLocalDetailPatch = (patch: (detail: ProspectDetail) => ProspectDetail) => {
    setSelectedProspectDetail((current) => {
      if (!current) {
        return current
      }

      const next = patch(current)
      setProspects((prev) => upsertSummary(prev, toSummary(next)))
      return next
    })
  }

  const queueScenarioMap = useMemo(() => {
    const map = new Map<string, ScenarioSeed>()
    summaryRecords.forEach((record) => {
      const scenario = scenarioByExternalKey.get(record.externalKey ?? record.id)
      if (scenario) {
        map.set(record.id, scenario)
      }
    })
    return map
  }, [summaryRecords])

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
      counts[view.id] = summaryRecords.filter((record) => view.filter(record, queueScenarioMap.get(record.id))).length
    })
    return counts
  }, [queueScenarioMap, summaryRecords])

  const activeView = queueViews.find((view) => view.id === selectedViewId) ?? queueViews[0]

  const recordsInView = useMemo(() => {
    if (!activeView) {
      return summaryRecords
    }

    return summaryRecords.filter((record) => activeView.filter(record, queueScenarioMap.get(record.id)))
  }, [activeView, queueScenarioMap, summaryRecords])

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const sortedRecords = [...recordsInView].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )

    if (!normalizedSearch) {
      return sortedRecords
    }

    return sortedRecords.filter((record) => {
      const scenario = queueScenarioMap.get(record.id)
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
  }, [queueScenarioMap, recordsInView, searchTerm])

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

  const selectedStage =
    selectedRecord && stageSelectionRecordId === selectedRecord.id
      ? selectedStageState
      : selectedRecord?.stage ?? 'New lead'

  const setSelectedStage = (value: LeadStage) => {
    setStageSelectionRecordId(effectiveSelectedRecordId)
    setSelectedStageState(value)
  }

  const persistReviewPatch = (prospectId: string, payload: Record<string, string>) => {
    if (reviewSaveTimerRef.current) {
      window.clearTimeout(reviewSaveTimerRef.current)
    }

    reviewSavePayloadRef.current = {
      ...reviewSavePayloadRef.current,
      ...payload,
    }

    reviewSaveTimerRef.current = window.setTimeout(async () => {
      const nextPayload = { ...reviewSavePayloadRef.current }
      reviewSavePayloadRef.current = {}

      try {
        const detail = await apiFetch<ProspectDetail>(`/prospects/${prospectId}/review`, {
          method: 'PATCH',
          json: nextPayload,
          csrfToken: session.csrfToken,
        })
        syncDetail(detail)
      } catch (error) {
        setToastMessage(deriveApiErrorMessage(error, 'Unable to save review changes right now.'))
      }
    }, 450)
  }

  const persistOwnershipPatch = (prospectId: string, payload: Record<string, string>) => {
    if (ownershipSaveTimerRef.current) {
      window.clearTimeout(ownershipSaveTimerRef.current)
    }

    ownershipSavePayloadRef.current = {
      ...ownershipSavePayloadRef.current,
      ...payload,
    }

    ownershipSaveTimerRef.current = window.setTimeout(async () => {
      const nextPayload = { ...ownershipSavePayloadRef.current }
      ownershipSavePayloadRef.current = {}

      try {
        const detail = await apiFetch<ProspectDetail>(`/prospects/${prospectId}/ownership`, {
          method: 'PATCH',
          json: nextPayload,
          csrfToken: session.csrfToken,
        })
        syncDetail(detail)
      } catch (error) {
        setToastMessage(deriveApiErrorMessage(error, 'Unable to save field updates right now.'))
      }
    }, 450)
  }

  const flushOwnershipPatch = async (prospectId: string) => {
    if (ownershipSaveTimerRef.current) {
      window.clearTimeout(ownershipSaveTimerRef.current)
      ownershipSaveTimerRef.current = null
    }

    const nextPayload = { ...ownershipSavePayloadRef.current }
    ownershipSavePayloadRef.current = {}

    if (!Object.keys(nextPayload).length) {
      return null
    }

    const detail = await apiFetch<ProspectDetail>(`/prospects/${prospectId}/ownership`, {
      method: 'PATCH',
      json: nextPayload,
      csrfToken: session.csrfToken,
    })
    syncDetail(detail)
    return detail
  }

  const handleSelectRecord = (recordId: string) => {
    const nextRecord = summaryRecords.find((record) => record.id === recordId)
    setSelectedRecordId(recordId)
    setShowScenarioLibrary(false)
    setSelectedProspectDetail(null)
    setStageSelectionRecordId(recordId)
    setSelectedStageState(nextRecord?.stage ?? 'New lead')
    setAiSuggestion(null)
    setDraftNextTouchDueAt('')
  }

  const handleToggleScenarioLibrary = () => {
    setShowScenarioLibrary((current) => !current)
  }

  const handleToggleWalkthrough = () => {
    setWalkthroughActive((current) => !current)
  }

  const handleLogActivity = async () => {
    if (!selectedRecord?.persistedId || !draftReply.trim()) return
    if (requiresCannedEdit) {
      setToastMessage('Edit the outreach template before logging it so the touch feels account-specific.')
      return
    }

    try {
      const detail = await apiFetch<ProspectDetail>(`/prospects/${selectedRecord.persistedId}/activities`, {
        method: 'POST',
        csrfToken: session.csrfToken,
        json: {
          type: draftActivityType,
          summary: draftReply.trim(),
          outcome: draftOutcome.trim() || undefined,
          nextStep: draftNextStep.trim() || undefined,
          nextTouchDueAt: draftNextTouchDueAt ? toIso(draftNextTouchDueAt) : undefined,
          crmUpdated: draftCrmUpdated,
        },
      })

      syncDetail(detail)
      setDraftReply('')
      setDraftOutcome('')
      setDraftNextStep('')
      setDraftNextTouchDueAt('')
      setDraftCrmUpdated(true)
      setSelectedReplyId(null)
      setToastMessage(`${activityTypeLabels[draftActivityType]} logged.`)
    } catch (error) {
      setToastMessage(deriveApiErrorMessage(error, 'Unable to log the activity right now.'))
    }
  }

  const handleUseCannedReply = (replyId: string) => {
    const reply = cannedReplies.find((item) => item.id === replyId)
    if (!reply) return
    setSelectedReplyId(reply.id)
    setDraftReply(formatCannedText(reply))
    setDraftActivityType('outbound-email')
  }

  const handleSharePlaybook = async (article: PlaybookArticle) => {
    if (!selectedRecord?.persistedId) return

    try {
      const detail = await apiFetch<ProspectDetail>(`/prospects/${selectedRecord.persistedId}/notes`, {
        method: 'POST',
        csrfToken: session.csrfToken,
        json: {
          body: `Matched playbook "${article.title}" for ${article.focusArea}. ${article.summary}`,
          nextStep: selectedRecord.recommendedNextAction || 'Use the playbook to tighten the next touch.',
          outcome: 'Playbook surfaced',
          playbookId: article.id,
        },
      })

      syncDetail(detail)
      setToastMessage(`Added "${article.title}" to the record playbooks.`)
    } catch (error) {
      setToastMessage(deriveApiErrorMessage(error, 'Unable to save the playbook note right now.'))
    }
  }

  const handleShareSelectedArticle = () => {
    if (!selectedArticleId) return
    const article = playbookSuggestions.find((item) => item.id === selectedArticleId)
    if (!article) return
    void handleSharePlaybook(article)
  }

  const handleRecordFieldChange = (
    field: 'owner' | 'buyerPersona' | 'nextTouchDueAt' | 'disqualificationReason',
    value: string,
  ) => {
    if (!selectedRecord?.persistedId) return

    const normalizedValue = field === 'nextTouchDueAt' ? toIso(value) : value
    const apiField = field

    setProspects((current) =>
      current.map((summary) => {
        if (summary.id !== selectedRecord.persistedId) {
          return summary
        }

        const nextSummary = {
          ...summary,
          [field]: normalizedValue,
        } as ProspectSummary

        return {
          ...nextSummary,
          crmCompleteness: computeCrmCompleteness({
            ...selectedRecord,
            ...nextSummary,
            nextTouchDueAt: nextSummary.nextTouchDueAt,
          }),
        }
      }),
    )

    applyLocalDetailPatch((current) => {
      const next = {
        ...current,
        [field]: normalizedValue,
      } as ProspectDetail

      next.crmCompleteness = computeCrmCompleteness({
        ...next,
        nextTouchDueAt: next.nextTouchDueAt,
      })

      return next
    })

    persistOwnershipPatch(selectedRecord.persistedId, {
      [apiField]: normalizedValue,
    })
  }

  const handleReviewChange = (field: keyof ProspectRecord['review'], value: string) => {
    if (!selectedRecord?.persistedId) return

    setProspects((current) =>
      current.map((summary) =>
        summary.id === selectedRecord.persistedId
          ? {
              ...summary,
              review: {
                ...summary.review,
                [field]: value as PlaybookStatus,
              },
            }
          : summary,
      ),
    )

    applyLocalDetailPatch((current) => ({
      ...current,
      review: {
        ...current.review,
        [field]: value as PlaybookStatus,
      },
    }))

    persistReviewPatch(selectedRecord.persistedId, {
      [field]: value,
    })
  }

  const handleApplyStageChange = async () => {
    if (!selectedRecord?.persistedId) return

    const pendingRecord = {
      ...selectedRecord,
      stage: selectedStage,
    }
    const gate = canMoveToStage(pendingRecord, selectedStage, selectedScenario)
    if (!gate.allowed) {
      setToastMessage(gate.message)
      return
    }

    try {
      await flushOwnershipPatch(selectedRecord.persistedId)
      const detail = await apiFetch<ProspectDetail>(`/prospects/${selectedRecord.persistedId}/stage-transitions`, {
        method: 'POST',
        csrfToken: session.csrfToken,
        json: {
          toStage: selectedStage,
        },
      })
      syncDetail(detail)
      setStageSelectionRecordId(selectedRecord.id)
      setSelectedStageState(detail.stage)
      setToastMessage(`${selectedStage} stage applied.`)
    } catch (error) {
      setToastMessage(deriveApiErrorMessage(error, 'Unable to apply the stage change right now.'))
    }
  }

  const handleGenerateAiSuggestion = (kind: AiSuggestionKind) => {
    if (!selectedRecord) return
    setAiSuggestion(buildAiSuggestion(kind, selectedRecord, selectedScenario, playbookSuggestions))
  }

  const handleApplyAiSuggestion = async () => {
    if (!selectedRecord?.persistedId || !aiSuggestion) return

    try {
      const detail = await apiFetch<ProspectDetail>(`/prospects/${selectedRecord.persistedId}/ai-fields`, {
        method: 'PATCH',
        csrfToken: session.csrfToken,
        json: {
          kind: aiSuggestion.kind,
          body: aiSuggestion.body,
        },
      })

      syncDetail(detail)

      if (aiSuggestion.kind === 'next-step') {
        setDraftNextStep(aiSuggestion.body)
      }

      if (aiSuggestion.kind === 'draft') {
        setDraftReply(aiSuggestion.body)
        setDraftActivityType('outbound-email')
      }

      setAiSuggestion((previous) => (previous ? { ...previous, applied: true } : previous))
      setToastMessage(`${aiSuggestion.headline} applied.`)
    } catch (error) {
      setToastMessage(deriveApiErrorMessage(error, 'Unable to apply the AI suggestion right now.'))
    }
  }

  const handleReset = async () => {
    try {
      const data = await apiFetch<{ records: ProspectSummary[] }>('/demo/reset', {
        method: 'POST',
        csrfToken: session.csrfToken,
      })
      setProspects(data.records)
      setSelectedProspectDetail(null)
      setSelectedRecordId(data.records[0]?.externalKey ?? '')
      setSearchTerm('')
      setSelectedViewId(queueViews[0]?.id ?? 'new-leads')
      setSelectedReplyId(null)
      setDraftReply('')
      setDraftActivityType('outbound-email')
      setDraftOutcome('')
      setDraftNextStep('')
      setDraftNextTouchDueAt('')
      setDraftCrmUpdated(true)
      setStageSelectionRecordId(data.records[0]?.externalKey ?? '')
      setSelectedStageState('New lead')
      setAiSuggestion(null)
      setToastMessage('Demo data reset. HostDesk sales-ops scenarios are back to baseline.')
    } catch (error) {
      setToastMessage(deriveApiErrorMessage(error, 'Unable to reset the demo workspace right now.'))
    }
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
    jumpTargetId: selectedRecord?.id ?? summaryRecords[0]?.id ?? '',
    searchTerm,
    setSearchTerm,
    scenarioMap,
    handleSelectRecord,
    handleToggleScenarioLibrary,
    handleToggleWalkthrough,
    showScenarioLibrary,
    walkthroughActive,
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
    workspaceLoading: prospectsLoading || (Boolean(selectedPersistedId) && selectedRecordLoading),
    workspaceError: prospectsError ?? selectedRecordError,
    refreshProspects,
    refreshSelectedProspect,
  }
}
