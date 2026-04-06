import { scenarioCatalog } from '../data'
import { adaptProspectDetail, scenarioByExternalKey } from '../api/adapters'
import { canMoveToStage } from '../app/utils/routing'
import type {
  ActivityEntry,
  CadenceTask,
  MetricsSnapshot,
  ProspectDetail,
  ProspectSummary,
  SessionState,
  StageHistoryEntry,
} from '../types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const baseSession: SessionState = {
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

let idCounter = 1000
let mockSession = clone(baseSession)
let mockProspects: ProspectDetail[] = []

const countFilled = (values: Array<string | string[]>) =>
  values.filter((value) => (Array.isArray(value) ? value.length > 0 : value.trim().length > 0)).length

const computeCrmCompleteness = (record: ProspectDetail) => {
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

const summaryFromDetail = (detail: ProspectDetail): ProspectSummary => ({
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

const buildInitialProspects = (): ProspectDetail[] =>
  scenarioCatalog.map((scenario, index) => {
    const record = clone(scenario.record)
    const notes = record.activities
      .filter((activity) => activity.type === 'note-added')
      .map((activity, noteIndex) => ({
        id: `note-${index + 1}-${noteIndex + 1}`,
        authorUserId: baseSession.user!.id,
        authorName: baseSession.user!.displayName,
        body: activity.summary,
        createdAt: activity.timestamp,
      }))

    const cadenceTasks: CadenceTask[] = record.nextTouchDueAt
      ? [
          {
            id: `task-${index + 1}`,
            prospectId: String(index + 1),
            stepName: 'Follow up on current next step',
            channel: record.activities[0]?.channel ?? 'email',
            dueAt: record.nextTouchDueAt,
            completedAt: null,
            status: 'open',
          },
        ]
      : []

    const stageHistory: StageHistoryEntry[] = [
      {
        id: `history-${index + 1}`,
        prospectId: String(index + 1),
        fromStage: null,
        toStage: record.stage,
        changedByUserId: baseSession.user!.id,
        changedByName: baseSession.user!.displayName,
        changedAt: record.stageEnteredAt,
      },
    ]

    return {
      ...record,
      id: String(index + 1),
      externalKey: record.id,
      activities: clone(record.activities),
      notes,
      cadenceTasks,
      stageHistory,
    }
  })

const nowIso = () => new Date().toISOString()

const makeActivity = (overrides: Partial<ActivityEntry>): ActivityEntry => ({
  id: `activity-${idCounter++}`,
  type: 'note-added',
  owner: baseSession.user!.displayName,
  timestamp: nowIso(),
  channel: 'internal',
  outcome: 'Captured',
  summary: 'Captured update.',
  nextStep: 'Next step not captured',
  crmUpdated: false,
  ...overrides,
})

const makeStageHistory = (prospectId: string, fromStage: string | null, toStage: string): StageHistoryEntry => ({
  id: `history-${idCounter++}`,
  prospectId,
  fromStage,
  toStage,
  changedByUserId: baseSession.user!.id,
  changedByName: baseSession.user!.displayName,
  changedAt: nowIso(),
})

const asEnvelope = <T>(data: T, status = 200) =>
  new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const asError = (code: string, message: string, status = 400, fieldErrors: Record<string, string> = {}) =>
  new Response(
    JSON.stringify({
      ok: false,
      error: { code, message, fieldErrors },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  )

const findProspect = (id: string) => mockProspects.find((prospect) => prospect.id === id)

const parseJson = (init?: RequestInit) => {
  if (!init?.body || typeof init.body !== 'string') {
    return {}
  }

  return JSON.parse(init.body) as Record<string, unknown>
}

const updateProspect = (id: string, updater: (detail: ProspectDetail) => ProspectDetail) => {
  mockProspects = mockProspects.map((prospect) => {
    if (prospect.id !== id) {
      return prospect
    }

    const next = updater(clone(prospect))
    next.crmCompleteness = computeCrmCompleteness(next)
    return next
  })

  return findProspect(id)!
}

const buildMetrics = (range: '7d' | '30d'): MetricsSnapshot => {
  const rangeDays = range === '7d' ? 7 : 30
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - rangeDays)

  const outboundProspectIds = new Set<string>()
  const replyProspectIds = new Set<string>()
  let meetingsBooked = 0

  mockProspects.forEach((prospect) => {
    prospect.activities.forEach((activity) => {
      const createdAt = new Date(activity.timestamp)
      if (createdAt < cutoff) return
      if (['outbound-email', 'call-attempt', 'linkedin-touch'].includes(activity.type)) {
        outboundProspectIds.add(prospect.id)
      }
      if (activity.type === 'reply-received') {
        replyProspectIds.add(prospect.id)
      }
      if (activity.type === 'meeting-booked') {
        meetingsBooked += 1
      }
    })
  })

  const overdueItems = mockProspects
    .flatMap((prospect) =>
      prospect.cadenceTasks
        .filter((task) => task.status === 'open' && new Date(task.dueAt) < new Date())
        .map((task) => ({
          company: prospect.company,
          owner: prospect.owner,
          stepName: task.stepName,
          dueAt: task.dueAt,
        })),
    )
    .slice(0, 25)

  return {
    range,
    responseRatePct: outboundProspectIds.size ? Number(((replyProspectIds.size / outboundProspectIds.size) * 100).toFixed(1)) : 0,
    stageConversions: mockProspects
      .flatMap((prospect) => prospect.stageHistory)
      .map((item) => ({
        fromStage: item.fromStage,
        toStage: item.toStage,
        convertedProspects: 1,
        conversionPct: item.fromStage ? 100 : null,
      })),
    overdueFollowups: overdueItems.length,
    tasksDueToday: mockProspects.flatMap((prospect) => prospect.cadenceTasks).filter((task) => {
      const dueDate = new Date(task.dueAt)
      const now = new Date()
      return task.status === 'open' && dueDate.toDateString() === now.toDateString()
    }).length,
    meetingsBooked,
    overdueItems,
  }
}

export const resetMockApiState = () => {
  idCounter = 1000
  mockSession = clone(baseSession)
  mockProspects = buildInitialProspects()
}

export const mockApiFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const parsedUrl = new URL(url, 'http://localhost')
  const path = parsedUrl.pathname
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = parseJson(init)

  if (path === '/api/auth/session' && method === 'GET') {
    return asEnvelope(mockSession)
  }

  if (path === '/api/auth/login' && method === 'POST') {
    mockSession = clone(baseSession)
    return asEnvelope(mockSession)
  }

  if (path === '/api/auth/register' && method === 'POST') {
    mockSession = clone(baseSession)
    return asEnvelope(mockSession)
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    mockSession = {
      authenticated: false,
      user: null,
      csrfToken: null,
    }
    return asEnvelope(mockSession)
  }

  if (path === '/api/prospects' && method === 'GET') {
    return asEnvelope({
      prospects: mockProspects.map(summaryFromDetail),
    })
  }

  const prospectMatch = path.match(/^\/api\/prospects\/(\d+)$/)
  if (prospectMatch && method === 'GET') {
    const prospect = findProspect(prospectMatch[1])
    return prospect ? asEnvelope(clone(prospect)) : asError('prospect_not_found', 'Prospect not found.', 404)
  }

  const notesMatch = path.match(/^\/api\/prospects\/(\d+)\/notes$/)
  if (notesMatch && method === 'POST') {
    const prospect = updateProspect(notesMatch[1], (current) => {
      const next = clone(current)
      const note = {
        id: `note-${idCounter++}`,
        authorUserId: baseSession.user!.id,
        authorName: baseSession.user!.displayName,
        body: String(body.body ?? ''),
        createdAt: nowIso(),
      }

      next.notes.push(note)
      next.activities.push(
        makeActivity({
          type: 'note-added',
          summary: note.body,
          outcome: String(body.outcome ?? 'Captured'),
          nextStep: String(body.nextStep ?? next.recommendedNextAction ?? 'Next step not captured'),
        }),
      )
      if (typeof body.nextStep === 'string' && body.nextStep.trim()) {
        next.recommendedNextAction = body.nextStep
      }
      if (typeof body.playbookId === 'string' && !next.playbookMatches.includes(body.playbookId)) {
        next.playbookMatches.push(body.playbookId)
      }
      return next
    })

    return asEnvelope(clone(prospect))
  }

  const activitiesMatch = path.match(/^\/api\/prospects\/(\d+)\/activities$/)
  if (activitiesMatch && method === 'POST') {
    const prospect = updateProspect(activitiesMatch[1], (current) => {
      const next = clone(current)
      const nextTouchDueAt = typeof body.nextTouchDueAt === 'string' ? body.nextTouchDueAt : next.nextTouchDueAt
      next.activities.push(
        makeActivity({
          type: body.type as ActivityEntry['type'],
          channel: ({
            'outbound-email': 'email',
            'call-attempt': 'call',
            'linkedin-touch': 'linkedin',
            'reply-received': 'email',
            'meeting-booked': 'meeting',
            'enrichment-update': 'crm',
          }[String(body.type)] ?? 'internal') as ActivityEntry['channel'],
          summary: String(body.summary ?? ''),
          outcome: String(body.outcome ?? 'Captured'),
          nextStep: String(body.nextStep ?? 'Next step not captured'),
          crmUpdated: Boolean(body.crmUpdated ?? true),
        }),
      )
      next.lastTouchAt = nowIso()
      next.nextTouchDueAt = nextTouchDueAt
      if (typeof body.nextStep === 'string' && body.nextStep.trim()) {
        next.recommendedNextAction = body.nextStep
      }
      return next
    })

    return asEnvelope(clone(prospect))
  }

  const reviewMatch = path.match(/^\/api\/prospects\/(\d+)\/review$/)
  if (reviewMatch && method === 'PATCH') {
    const prospect = updateProspect(reviewMatch[1], (current) => ({
      ...current,
      review: {
        ...current.review,
        ...(body as unknown as Partial<ProspectDetail['review']>),
      },
    }))
    return asEnvelope(clone(prospect))
  }

  const ownershipMatch = path.match(/^\/api\/prospects\/(\d+)\/ownership$/)
  if (ownershipMatch && method === 'PATCH') {
    const prospect = updateProspect(ownershipMatch[1], (current) => {
      const next = { ...current }
      if (typeof body.owner === 'string') next.owner = body.owner
      if (typeof body.buyerPersona === 'string') next.buyerPersona = body.buyerPersona
      if (typeof body.nextTouchDueAt === 'string') next.nextTouchDueAt = body.nextTouchDueAt
      if (typeof body.disqualificationReason === 'string') next.disqualificationReason = body.disqualificationReason
      return next
    })
    return asEnvelope(clone(prospect))
  }

  const aiMatch = path.match(/^\/api\/prospects\/(\d+)\/ai-fields$/)
  if (aiMatch && method === 'PATCH') {
    const prospect = updateProspect(aiMatch[1], (current) => {
      const next = clone(current)
      const kind = String(body.kind)
      const content = String(body.body ?? '')
      if (kind === 'summary') next.aiSummary = content
      if (kind === 'next-step') next.recommendedNextAction = content
      next.activities.push(
        makeActivity({
          type: 'ai-draft-used',
          summary:
            kind === 'summary'
              ? 'Applied AI account summary to the record.'
              : kind === 'next-step'
              ? 'Applied AI next-best-action guidance to the record.'
              : 'Applied AI follow-up draft to the activity composer.',
          outcome:
            kind === 'summary' ? 'Summary applied' : kind === 'next-step' ? 'Next step applied' : 'Draft applied',
          nextStep: kind === 'next-step' ? content : next.recommendedNextAction,
          crmUpdated: kind !== 'draft',
        }),
      )
      return next
    })
    return asEnvelope(clone(prospect))
  }

  const stageMatch = path.match(/^\/api\/prospects\/(\d+)\/stage-transitions$/)
  if (stageMatch && method === 'POST') {
    const prospect = findProspect(stageMatch[1])
    if (!prospect) {
      return asError('prospect_not_found', 'Prospect not found.', 404)
    }

    const nextStage = String(body.toStage ?? '')
    const uiRecord = adaptProspectDetail(prospect)
    const gate = canMoveToStage(
      {
        ...uiRecord,
        stage: nextStage as ProspectDetail['stage'],
      },
      nextStage as ProspectDetail['stage'],
      scenarioByExternalKey.get(prospect.externalKey),
    )

    if (!gate.allowed) {
      return asError('stage_gate_failed', gate.message, 422)
    }

    const updated = updateProspect(stageMatch[1], (current) => {
      const next = clone(current)
      next.stage = nextStage as ProspectDetail['stage']
      next.stageEnteredAt = nowIso()
      next.stageHistory.push(makeStageHistory(current.id, current.stage, nextStage))
      next.activities.push(
        makeActivity({
          type: 'stage-changed',
          channel: 'crm',
          outcome: `Moved to ${nextStage}`,
          summary: `Stage moved to ${nextStage}.`,
          nextStep: next.nextTouchDueAt
            ? `Next touch remains scheduled for ${new Date(next.nextTouchDueAt).toLocaleString()}.`
            : 'Next step should be reviewed.',
          crmUpdated: true,
        }),
      )
      return next
    })

    return asEnvelope(clone(updated))
  }

  const resetMatch = path === '/api/demo/reset' && method === 'POST'
  if (resetMatch) {
    resetMockApiState()
    return asEnvelope({
      records: mockProspects.map(summaryFromDetail),
    })
  }

  if (path === '/api/metrics' && method === 'GET') {
    const range = parsedUrl.searchParams.get('range') === '7d' ? '7d' : '30d'
    return asEnvelope(buildMetrics(range))
  }

  return asError('not_found', `No mock route for ${method} ${path}.`, 404)
}

resetMockApiState()
