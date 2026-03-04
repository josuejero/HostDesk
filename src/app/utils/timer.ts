import { addMinutes, differenceInSeconds, formatDuration, intervalToDuration } from 'date-fns'
import type { Ticket } from '../../types'

export type TimerStatus = 'normal' | 'warning' | 'overdue'

const timerStateThresholdSeconds = 5 * 60

export const timerStatusDescriptions: Record<TimerStatus, string> = {
  normal: 'Within SLA expectations',
  warning: 'Approaching the SLA window',
  overdue: 'SLA missed and ticket is overdue',
}

export const getCountdownLabel = (ticket: Ticket) => {
  const created = new Date(ticket.createdAt)
  const target = addMinutes(created, ticket.slaTargetMinutes)
  const secondsRemaining = differenceInSeconds(target, new Date())

  if (secondsRemaining <= 0) {
    const duration = intervalToDuration({ start: target, end: new Date() })
    return `Overdue by ${formatDuration(duration, { format: ['hours', 'minutes'] })}`
  }

  const duration = intervalToDuration({ start: new Date(), end: target })
  return `${formatDuration(duration, { format: ['hours', 'minutes'] })} remaining`
}

export const getTimerStatus = (ticket: Ticket): TimerStatus => {
  const target = addMinutes(new Date(ticket.createdAt), ticket.slaTargetMinutes)
  const secondsRemaining = differenceInSeconds(target, new Date())
  if (secondsRemaining <= 0) {
    return 'overdue'
  }
  if (secondsRemaining <= timerStateThresholdSeconds) {
    return 'warning'
  }
  return 'normal'
}
