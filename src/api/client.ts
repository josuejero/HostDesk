import type { SessionState } from '../types'

export type ApiRequestInit = Omit<RequestInit, 'body'> & {
  body?: BodyInit | null
  json?: unknown
  csrfToken?: string | null
}

export class ApiClientError extends Error {
  code: string
  status: number
  fieldErrors: Record<string, string>

  constructor(message: string, options: { code?: string; status: number; fieldErrors?: Record<string, string> } ) {
    super(message)
    this.name = 'ApiClientError'
    this.code = options.code ?? 'request_failed'
    this.status = options.status
    this.fieldErrors = options.fieldErrors ?? {}
  }
}

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: {
        code: string
        message: string
        fieldErrors?: Record<string, string>
      }
    }

const toApiPath = (path: string) => (path.startsWith('/api') ? path : `/api${path}`)

export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { json, csrfToken, headers, method, body, ...rest } = init
  const resolvedMethod = (method ?? (json !== undefined ? 'POST' : 'GET')).toUpperCase()
  const requestHeaders = new Headers(headers ?? {})

  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(resolvedMethod)) {
    requestHeaders.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(toApiPath(path), {
    ...rest,
    method: resolvedMethod,
    headers: requestHeaders,
    body: json !== undefined ? JSON.stringify(json) : body,
    credentials: 'same-origin',
  })

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok || payload?.ok === false || payload === null) {
    const errorMessage = payload && 'error' in payload ? payload.error.message : `Request failed: ${response.status}`
    const errorCode = payload && 'error' in payload ? payload.error.code : 'request_failed'
    const fieldErrors = payload && 'error' in payload ? payload.error.fieldErrors ?? {} : {}
    throw new ApiClientError(errorMessage, {
      code: errorCode,
      status: response.status,
      fieldErrors,
    })
  }

  return payload.data
}

export const emptySessionState: SessionState = {
  authenticated: false,
  user: null,
  csrfToken: null,
}
