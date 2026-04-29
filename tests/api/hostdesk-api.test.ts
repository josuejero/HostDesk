// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { MetricsSnapshot, ProspectDetail, ProspectSummary, SessionState } from '../../src/types'

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

maybeDescribe('HostDesk PHP API', () => {
  it('registers, enforces stage rules, persists notes, returns metrics, and logs out', async () => {
    const client = new ApiSessionClient(apiBaseUrl!)
    const email = `hostdesk-api-${Date.now()}@example.com`

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

    expect(blockedTransition.response.status).toBe(422)
    const blockedPayload = (await blockedTransition.response.json()) as {
      ok: false
      error: { code: string; message: string }
    }
    expect(blockedPayload.error.code).toBe('stage_gate_failed')

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
    const email = `hostdesk-csrf-${Date.now()}@example.com`

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

    expect(rejected.response.status).toBe(403)
    const payload = (await rejected.response.json()) as {
      ok: false
      error: { code: string; message: string }
    }
    expect(payload.error.code).toBe('csrf_invalid')

    client.csrfToken = savedToken
  })
})
