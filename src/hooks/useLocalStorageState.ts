import { useEffect, useState } from 'react'

const hasWindow = typeof window !== 'undefined'

export function useLocalStorageState<T>(key: string, factory: () => T) {
  const getInitial = () => {
    if (!hasWindow) {
      return factory()
    }

    const stored = window.localStorage.getItem(key)
    if (!stored) {
      return factory()
    }

    try {
      return JSON.parse(stored) as T
    } catch (error) {
      console.warn('Failed to parse localStorage entry for', key, error)
      return factory()
    }
  }

  const [value, setValue] = useState<T>(getInitial)

  useEffect(() => {
    if (!hasWindow) {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Unable to persist state for', key, error)
    }
  }, [key, value])

  const reset = () => setValue(factory())

  return [value, setValue, reset] as const
}
