// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { CadenceTask, MetricsSnapshot, ProspectDetail, ProspectSummary, SessionState } from '../../src/types'

const apiBaseUrl = process.env.HOSTDESK_API_BASE_URL
const maybeDescribe = apiBaseUrl ? describe : describe.skip

class ApiSessionClient {
  private cookies = new Map<string, string>()
  csrfToken: string | null = null

  constructor(private readonly baseUrl: string) {}

  async json<T>(
    path: string,
    init: RequestInit & {
      json?: unknown
      allowError?: false
    } = {},
  ): Promise<T> {
    const result = await this.request(path, init)
    const payload = (await result.response.json()) as { ok: true; data: T }
    this.captureCsrf(payload.data)
    return payload.data
  }

  async request(
    path: string,
    init: RequestInit & {
      json?: unknown
      allowError?: boolean
    } = {},
  ) {
    const { json, allowError = false, headers, ...rest } = init
    const requestHeaders = new Headers(headers ?? {})

    if (json !== undefined) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    if (this.csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((rest.method ?? 'GET').toUpperCase())) {
      requestHeaders.set('X-CSRF-Token', this.csrfToken)
    }

    const cookieHeader = Array.from(this.cookies.values()).join('; ')
    if (cookieHeader) {
      requestHeaders.set('Cookie', cookieHeader)
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })

    this.captureCookies(response)

    if (!allowError) {
      expect(response.ok).toBe(true)
    }

    return { response }
  }

  private captureCookies(response: Response) {
    const headerBag = response.headers as Headers & { getSetCookie?: () => string[] }
    const setCookies = typeof headerBag.getSetCookie === 'function'
      ? headerBag.getSetCookie()
      : response.headers.get('set-cookie')
      ? [response.headers.get('set-cookie') as string]
      : []

    setCookies.forEach((cookie) => {
      const [pair] = cookie.split(';')
      const [name] = pair.split('=')
      this.cookies.set(name, pair)
    })
  }

  private captureCsrf<T>(data: T) {
    if (data && typeof data === 'object' && 'csrfToken' in (data as Record<string, unknown>)) {
      const token = (data as Record<string, unknown>).csrfToken
      this.csrfToken = typeof token === 'string' ? token : null
    }
  }
}

type ApiErrorPayload = {
  ok: false
  error: {
    code: string
    message: string
    fieldErrors: Record<string, string>
  }
}

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
}

async function expectApiError(result: { response: Response }, status: number, code: string) {
  expect(result.response.status).toBe(status)
  const payload = (await result.response.json()) as ApiErrorPayload
  expect(payload.ok).toBe(false)
  expect(payload.error.code).toBe(code)
  return payload
}

async function registerClient(prefix: string) {
  const client = new ApiSessionClient(apiBaseUrl!)
  const email = uniqueEmail(prefix)

  const session = await client.json<SessionState>('/api/auth/register', {
    method: 'POST',
    json: {
      email,
      password: 'Password123!',
      displayName: `${prefix} Tester`,
    },
  })

  const list = await client.json<{ prospects: ProspectSummary[] }>('/api/prospects')

  return { client, email, list, session }
}

async function ensureCadenceTask(client: ApiSessionClient, prospectId: string): Promise<CadenceTask> {
  const detail = await client.json<ProspectDetail>(`/api/prospects/${prospectId}`)
  const existingTask = detail.cadenceTasks[0]
  if (existingTask) return existingTask

  const created = await client.json<ProspectDetail>(`/api/prospects/${prospectId}/cadence-tasks`, {
    method: 'POST',
    json: {
      stepName: 'API follow-up task',
      channel: 'email',
      dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  })

  const createdTask = created.cadenceTasks.find((task) => task.stepName === 'API follow-up task')
  expect(createdTask).toBeTruthy()
  return createdTask!
}

maybeDescribe('HostDesk PHP API', () => {
  it('registers, enforces stage rules, persists notes, returns metrics, and logs out', async () => {
    const client = new ApiSessionClient(apiBaseUrl!)
    const email = uniqueEmail('hostdesk-api')

    const session = await client.json<SessionState>('/api/auth/register', {
      method: 'POST',
      json: {
        email,
        password: 'Password123!',
        displayName: 'API Integration Tester',
      },
    })

    expect(session.authenticated).toBe(true)
    expect(session.user?.email).toBe(email)
    expect(session.csrfToken).toBeTruthy()

    const list = await client.json<{ prospects: ProspectSummary[] }>('/api/prospects')
    expect(list.prospects.length).toBeGreaterThan(0)

    const researchProspect = list.prospects.find((prospect) => prospect.externalKey === 'lead-citrix-research')
    expect(researchProspect).toBeTruthy()

    const blockedTransition = await client.request(`/api/prospects/${researchProspect!.id}/stage-transitions`, {
      method: 'POST',
      json: {
        toStage: 'Handoff ready',
      },
      allowError: true,
    })

    await expectApiError(blockedTransition, 422, 'stage_gate_failed')

    const ownershipUpdated = await client.json<ProspectDetail>(`/api/prospects/${researchProspect!.id}/ownership`, {
      method: 'PATCH',
      json: {
        owner: 'Jordan Ellis',
        buyerPersona: 'Infrastructure Director',
        nextTouchDueAt: '2026-03-30T14:00:00.000Z',
      },
    })

    expect(ownershipUpdated.owner).toBe('Jordan Ellis')
    expect(ownershipUpdated.buyerPersona).toBe('Infrastructure Director')

    const transitioned = await client.json<ProspectDetail>(`/api/prospects/${researchProspect!.id}/stage-transitions`, {
      method: 'POST',
      json: {
        toStage: 'Handoff ready',
      },
    })

    expect(transitioned.stage).toBe('Handoff ready')

    const noted = await client.json<ProspectDetail>(`/api/prospects/${researchProspect!.id}/notes`, {
      method: 'POST',
      json: {
        body: 'API integration note for persisted follow-up.',
        nextStep: 'Confirm the handoff package and discovery agenda.',
      },
    })

    expect(noted.notes.some((note) => note.body.includes('API integration note'))).toBe(true)

    const metrics = await client.json<MetricsSnapshot>('/api/metrics?range=30d')
    expect(metrics.range).toBe('30d')
    expect(metrics.stageConversions.length).toBeGreaterThan(0)

    const reset = await client.json<{ records: ProspectSummary[] }>('/api/demo/reset', {
      method: 'POST',
    })
    expect(reset.records.length).toBe(list.prospects.length)

    const loggedOut = await client.json<SessionState>('/api/auth/logout', {
      method: 'POST',
    })
    expect(loggedOut.authenticated).toBe(false)
  })

  it('rejects state-changing API requests without a valid CSRF token', async () => {
    const client = new ApiSessionClient(apiBaseUrl!)
    const email = uniqueEmail('hostdesk-csrf')

    await client.json<SessionState>('/api/auth/register', {
      method: 'POST',
      json: {
        email,
        password: 'Password123!',
        displayName: 'CSRF Tester',
      },
    })

    const list = await client.json<{ prospects: ProspectSummary[] }>('/api/prospects')
    const target = list.prospects[0]
    const savedToken = client.csrfToken
    client.csrfToken = null

    const rejected = await client.request(`/api/prospects/${target.id}/notes`, {
      method: 'POST',
      json: {
        body: 'This should not be accepted without CSRF.',
      },
      allowError: true,
    })

    await expectApiError(rejected, 403, 'csrf_invalid')

    client.csrfToken = savedToken
  })

  it('rejects invalid login and keeps the session unauthenticated', async () => {
    const client = new ApiSessionClient(apiBaseUrl!)

    const beforeLogin = await client.json<SessionState>('/api/auth/session')
    expect(beforeLogin.authenticated).toBe(false)

    const failedLogin = await client.request('/api/auth/login', {
      method: 'POST',
      json: {
        email: uniqueEmail('missing-login'),
        password: 'WrongPassword123!',
      },
      allowError: true,
    })

    await expectApiError(failedLogin, 401, 'invalid_credentials')

    const afterLogin = await client.json<SessionState>('/api/auth/session')
    expect(afterLogin.authenticated).toBe(false)
    expect(afterLogin.user).toBeNull()
  })

  it('reports authenticated session state after login', async () => {
    const { client, email } = await registerClient('hostdesk-session')

    const loggedOut = await client.json<SessionState>('/api/auth/logout', {
      method: 'POST',
    })
    expect(loggedOut.authenticated).toBe(false)

    const loggedIn = await client.json<SessionState>('/api/auth/login', {
      method: 'POST',
      json: {
        email,
        password: 'Password123!',
      },
    })

    expect(loggedIn.authenticated).toBe(true)
    expect(loggedIn.user?.email).toBe(email)

    const session = await client.json<SessionState>('/api/auth/session')
    expect(session.authenticated).toBe(true)
    expect(session.user?.email).toBe(email)
    expect(session.csrfToken).toBeTruthy()
  })

  it('prevents one user from reading another user prospect detail', async () => {
    const owner = await registerClient('hostdesk-owner')
    const intruder = await registerClient('hostdesk-intruder')
    const target = owner.list.prospects[0]

    const rejected = await intruder.client.request(`/api/prospects/${target.id}`, {
      allowError: true,
    })

    await expectApiError(rejected, 404, 'prospect_not_found')
  })

  it('logs activities, persists them, and updates metrics', async () => {
    const { client, list } = await registerClient('hostdesk-activity')
    const target = list.prospects.find((prospect) => prospect.externalKey === 'lead-windows365-byod') ?? list.prospects[0]
    const beforeMetrics = await client.json<MetricsSnapshot>('/api/metrics?range=30d')

    const updated = await client.json<ProspectDetail>(`/api/prospects/${target.id}/activities`, {
      method: 'POST',
      json: {
        type: 'meeting-booked',
        summary: 'API integration booked a technical discovery meeting.',
        outcome: 'Booked',
        nextStep: 'Send the agenda and confirm attendees.',
        nextTouchDueAt: new Date(Date.now() + 172_800_000).toISOString(),
        crmUpdated: true,
      },
    })

    expect(
      updated.activities.some(
        (activity) =>
          activity.type === 'meeting-booked' && activity.summary.includes('technical discovery meeting'),
      ),
    ).toBe(true)
    expect(updated.recommendedNextAction).toBe('Send the agenda and confirm attendees.')

    const persisted = await client.json<ProspectDetail>(`/api/prospects/${target.id}`)
    expect(persisted.activities.some((activity) => activity.summary.includes('technical discovery meeting'))).toBe(true)

    const afterMetrics = await client.json<MetricsSnapshot>('/api/metrics?range=30d')
    expect(afterMetrics.meetingsBooked).toBeGreaterThanOrEqual(beforeMetrics.meetingsBooked + 1)
  })

  it('creates and updates cadence tasks', async () => {
    const { client, list } = await registerClient('hostdesk-cadence')
    const target = list.prospects.find((prospect) => prospect.externalKey === 'lead-windows365-byod') ?? list.prospects[0]

    const created = await client.json<ProspectDetail>(`/api/prospects/${target.id}/cadence-tasks`, {
      method: 'POST',
      json: {
        stepName: 'Confirm BYOD security constraints',
        channel: 'email',
        dueAt: new Date(Date.now() + 259_200_000).toISOString(),
      },
    })

    const task = created.cadenceTasks.find((item) => item.stepName === 'Confirm BYOD security constraints')
    expect(task).toBeTruthy()
    expect(task?.status).toBe('open')

    const completed = await client.json<ProspectDetail>(`/api/cadence-tasks/${task!.id}`, {
      method: 'PATCH',
      json: {
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    })

    const completedTask = completed.cadenceTasks.find((item) => item.id === task!.id)
    expect(completedTask?.status).toBe('completed')
    expect(completedTask?.completedAt).toBeTruthy()
  })

  it('persists review and AI-assisted field edits', async () => {
    const { client, list } = await registerClient('hostdesk-review-ai')
    const target = list.prospects.find((prospect) => prospect.externalKey === 'lead-citrix-research') ?? list.prospects[0]

    const reviewed = await client.json<ProspectDetail>(`/api/prospects/${target.id}/review`, {
      method: 'PATCH',
      json: {
        deduplication: 'API review confirmed no duplicate account.',
        stageCriteria: 'API review requires owner and next-step cleanup.',
        nextStepPlan: 'Assign owner and schedule the next touch.',
        handoffNotes: 'Hold handoff until ownership is documented.',
        playbookStatus: 'updated',
      },
    })

    expect(reviewed.review.deduplication).toBe('API review confirmed no duplicate account.')
    expect(reviewed.review.playbookStatus).toBe('updated')

    const aiUpdated = await client.json<ProspectDetail>(`/api/prospects/${target.id}/ai-fields`, {
      method: 'PATCH',
      json: {
        kind: 'summary',
        body: 'API-applied AI summary for the Citrix migration account.',
      },
    })

    expect(aiUpdated.aiSummary).toBe('API-applied AI summary for the Citrix migration account.')
    expect(aiUpdated.activities.some((activity) => activity.type === 'ai-draft-used')).toBe(true)
  })

  it('falls back to the 30-day metrics range for unsupported range values', async () => {
    const { client } = await registerClient('hostdesk-metrics-range')

    const metrics = await client.json<MetricsSnapshot>('/api/metrics?range=bad-value')

    expect(metrics.range).toBe('30d')
  })

  it('rejects every CSRF-protected mutation route without a token', async () => {
    const { client, list } = await registerClient('hostdesk-csrf-all')
    const target = list.prospects.find((prospect) => prospect.externalKey === 'lead-windows365-byod') ?? list.prospects[0]
    const cadenceTask = await ensureCadenceTask(client, target.id)

    const mutations: Array<{
      method: string
      path: string
      json?: unknown
    }> = [
      { method: 'POST', path: '/api/auth/logout' },
      {
        method: 'POST',
        path: `/api/prospects/${target.id}/notes`,
        json: { body: 'CSRF should reject this note.' },
      },
      {
        method: 'POST',
        path: `/api/prospects/${target.id}/activities`,
        json: { type: 'outbound-email', summary: 'CSRF should reject this activity.' },
      },
      {
        method: 'POST',
        path: `/api/prospects/${target.id}/cadence-tasks`,
        json: { stepName: 'CSRF rejected task', channel: 'email', dueAt: new Date().toISOString() },
      },
      {
        method: 'PATCH',
        path: `/api/cadence-tasks/${cadenceTask.id}`,
        json: { status: 'completed', completedAt: new Date().toISOString() },
      },
      {
        method: 'POST',
        path: `/api/prospects/${target.id}/stage-transitions`,
        json: { toStage: 'Active' },
      },
      {
        method: 'PATCH',
        path: `/api/prospects/${target.id}/review`,
        json: { deduplication: 'CSRF should reject this review.' },
      },
      {
        method: 'PATCH',
        path: `/api/prospects/${target.id}/ownership`,
        json: { owner: 'CSRF Rejected Owner' },
      },
      {
        method: 'PATCH',
        path: `/api/prospects/${target.id}/ai-fields`,
        json: { kind: 'summary', body: 'CSRF should reject this AI edit.' },
      },
      { method: 'POST', path: '/api/demo/reset' },
    ]

    for (const mutation of mutations) {
      const savedToken = client.csrfToken
      client.csrfToken = null

      const rejected = await client.request(mutation.path, {
        method: mutation.method,
        json: mutation.json,
        allowError: true,
      })

      await expectApiError(rejected, 403, 'csrf_invalid')
      client.csrfToken = savedToken
    }
  })
})
