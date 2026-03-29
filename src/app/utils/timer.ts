import { differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns'
import type { ProspectRecord } from '../../types'

export type TimerStatus = 'normal' | 'warning' | 'overdue' | 'missing'

const warningThresholdSeconds = 24 * 60 * 60

export const timerStatusDescriptions: Record<TimerStatus, string> = {
  normal: 'Next step is on track',
  warning: 'Follow-up due soon',
  overdue: 'Follow-up overdue',
  missing: 'Next step missing',
}

const formatRelativeDuration = (start: Date, end: Date) => {
  const duration = intervalToDuration({ start, end })
  const formatted = formatDuration(duration, { format: ['days', 'hours', 'minutes'] })
  return formatted || 'less than a minute'
}

export const getCountdownLabel = (record: ProspectRecord) => {
  if (!record.nextTouchDueAt.trim()) {
    return 'Next step missing'
  }

  const target = new Date(record.nextTouchDueAt)
  const secondsRemaining = differenceInSeconds(target, new Date())

  if (secondsRemaining <= 0) {
    return `Overdue by ${formatRelativeDuration(target, new Date())}`
  }

  return `${formatRelativeDuration(new Date(), target)} remaining`
}

export const getTimerStatus = (record: ProspectRecord): TimerStatus => {
  if (!record.nextTouchDueAt.trim()) {
    return 'missing'
  }

  const target = new Date(record.nextTouchDueAt)
  const secondsRemaining = differenceInSeconds(target, new Date())

  if (secondsRemaining <= 0) {
    return 'overdue'
  }

  if (secondsRemaining <= warningThresholdSeconds) {
    return 'warning'
  }

  return 'normal'
}
