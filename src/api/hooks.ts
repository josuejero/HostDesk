import { useEffect, useState } from 'react'
import { apiFetch, emptySessionState } from './client'
import type {
  MetricsRange,
  MetricsSnapshot,
  ProspectDetail,
  ProspectSummary,
  SessionState,
} from '../types'

export function useSession() {
  const [session, setSession] = useState<SessionState>(emptySessionState)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshSession = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextSession = await apiFetch<SessionState>('/auth/session')
      setSession(nextSession)
      return nextSession
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unable to load session.'
      setError(message)
      setSession(emptySessionState)
      return emptySessionState
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const nextSession = await apiFetch<SessionState>('/auth/session')
        if (cancelled) return
        setSession(nextSession)
      } catch (fetchError) {
        if (cancelled) return
        setSession(emptySessionState)
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load session.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (payload: { email: string; password: string }) => {
    const nextSession = await apiFetch<SessionState>('/auth/login', {
      method: 'POST',
      json: payload,
    })
    setSession(nextSession)
    setError(null)
    return nextSession
  }

  const register = async (payload: { email: string; password: string; displayName: string }) => {
    const nextSession = await apiFetch<SessionState>('/auth/register', {
      method: 'POST',
      json: payload,
    })
    setSession(nextSession)
    setError(null)
    return nextSession
  }

  const logout = async () => {
    const nextSession = await apiFetch<SessionState>('/auth/logout', {
      method: 'POST',
      csrfToken: session.csrfToken,
    })
    setSession(nextSession)
    return nextSession
  }

  return {
    session,
    isLoading,
    error,
    setSession,
    refreshSession,
    login,
    register,
    logout,
  }
}

export function useProspects(enabled: boolean) {
  const [prospects, setProspects] = useState<ProspectSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    if (!enabled) {
      setProspects([])
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await apiFetch<{ prospects: ProspectSummary[] }>('/prospects')
      setProspects(data.prospects)
      return data.prospects
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load prospects.')
      throw fetchError
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!enabled) {
        setProspects([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ prospects: ProspectSummary[] }>('/prospects')
        if (cancelled) return
        setProspects(data.prospects)
      } catch (fetchError) {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load prospects.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return {
    prospects,
    setProspects,
    isLoading,
    error,
    refresh,
  }
}

export function useProspect(prospectId: string | null, enabled: boolean) {
  const [prospect, setProspect] = useState<ProspectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async (nextProspectId = prospectId) => {
    if (!enabled || !nextProspectId) {
      setProspect(null)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await apiFetch<ProspectDetail>(`/prospects/${nextProspectId}`)
      setProspect(data)
      return data
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load prospect details.')
      throw fetchError
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!enabled || !prospectId) {
        setProspect(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const data = await apiFetch<ProspectDetail>(`/prospects/${prospectId}`)
        if (cancelled) return
        setProspect(data)
      } catch (fetchError) {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load prospect details.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [enabled, prospectId])

  return {
    prospect,
    setProspect,
    isLoading,
    error,
    refresh,
  }
}

export function useMetrics(range: MetricsRange, enabled: boolean) {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async (nextRange = range) => {
    if (!enabled) {
      setMetrics(null)
      return null
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch<MetricsSnapshot>(`/metrics?range=${nextRange}`)
      setMetrics(data)
      return data
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load metrics.')
      throw fetchError
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!enabled) {
        setMetrics(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const data = await apiFetch<MetricsSnapshot>(`/metrics?range=${range}`)
        if (cancelled) return
        setMetrics(data)
      } catch (fetchError) {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load metrics.')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [enabled, range])

  return {
    metrics,
    setMetrics,
    isLoading,
    error,
    refresh,
  }
}
