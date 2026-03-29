import { differenceInCalendarDays, isSameDay } from 'date-fns'
import type { LeadStage, ProspectRecord, ScenarioSeed } from '../../types'

export type RoutingInsights = {
  queueLabel: string
  queueReason: string
  icpHeadline: string
  icpMessage: string
  microsoftHeadline: string
  microsoftMessage: string
  urgencyHeadline: string
  urgencyMessage: string
  channelHeadline: string
  channelMessage: string
  handoffHeadline: string
  handoffMessage: string
  dataHygieneHeadline: string
  dataHygieneMessage: string
  microsoftMotion: string
  recommendedChannel: string
  dataHygieneRisk: 'Low' | 'Medium' | 'High'
}

export type StageGateResult = {
  allowed: boolean
  message: string
}

const normalizeText = (record: ProspectRecord, scenario?: ScenarioSeed) =>
  [
    record.subject,
    record.company,
    record.segment,
    record.useCase,
    record.buyerPersona,
    record.leadSource,
    ...record.microsoftFootprint,
    ...record.painPoints,
    ...record.objections,
    ...record.buyingSignals,
    ...(scenario?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const hasPattern = (text: string, pattern: RegExp) => pattern.test(text)

export const hasOutboundActivity = (record: ProspectRecord) =>
  record.activities.some((activity) =>
    ['outbound-email', 'call-attempt', 'linkedin-touch'].includes(activity.type),
  )

export const hasResponseOrMeetingActivity = (record: ProspectRecord) =>
  record.activities.some((activity) =>
    ['reply-received', 'meeting-booked'].includes(activity.type),
  )

export const hasDatedNextStep = (record: ProspectRecord) => Boolean(record.nextTouchDueAt.trim())

export const isRecordStale = (record: ProspectRecord) => {
  const baseline = record.lastTouchAt || record.createdAt
  return differenceInCalendarDays(new Date(), new Date(baseline)) >= 14
}

export const isFollowUpDueToday = (record: ProspectRecord) =>
  Boolean(record.nextTouchDueAt) && isSameDay(new Date(record.nextTouchDueAt), new Date())

export const getMicrosoftMotion = (record: ProspectRecord, scenario?: ScenarioSeed) => {
  const text = normalizeText(record, scenario)
  const avdScore = Number(hasPattern(text, /\b(avd|citrix|vdi|session host|host pool|shared desktop)\b/g))
    + Number(hasPattern(text, /\bcost|azure spend|migration\b/g))
  const windowsScore =
    Number(hasPattern(text, /\b(windows 365|cloud pc)\b/g))
    + Number(hasPattern(text, /\b(contractor|byod|personal device|seasonal)\b/g))
  const intuneScore =
    Number(hasPattern(text, /\bintune\b/g))
    + Number(hasPattern(text, /\b(compliance|policy|endpoint|patch|app deployment)\b/g))

  const scores = [
    { label: 'Azure Virtual Desktop', value: avdScore },
    { label: 'Windows 365', value: windowsScore },
    { label: 'Intune', value: intuneScore },
  ].sort((left, right) => right.value - left.value)

  if (scores[0].value === 0) {
    return 'Mixed motion'
  }

  if (scores[0].value === scores[1].value && scores[1].value > 0) {
    return 'Mixed motion'
  }

  return scores[0].label
}

export const getIcpFit = (record: ProspectRecord, scenario?: ScenarioSeed) => {
  const motion = getMicrosoftMotion(record, scenario)
  const normalizedSegment = record.segment.toLowerCase()

  if (
    motion !== 'Mixed motion' &&
    /(msp|healthcare|education|manufacturing|services|mid-market)/.test(normalizedSegment)
  ) {
    return 'Strong'
  }

  if (motion !== 'Mixed motion') {
    return 'Moderate'
  }

  return 'Developing'
}

export const getDataHygieneRisk = (record: ProspectRecord): 'Low' | 'Medium' | 'High' => {
  if (!record.owner.trim() || !hasDatedNextStep(record) || isRecordStale(record)) {
    return 'High'
  }

  if (record.crmCompleteness < 80) {
    return 'Medium'
  }

  return 'Low'
}

export const getRecommendedChannel = (record: ProspectRecord, scenario?: ScenarioSeed) => {
  const motion = getMicrosoftMotion(record, scenario)

  if (!hasOutboundActivity(record)) {
    return 'Email first touch'
  }

  if (motion === 'Windows 365') {
    return 'Email plus LinkedIn'
  }

  if (motion === 'Intune') {
    return 'Email follow-up'
  }

  if (record.segment.toLowerCase().includes('msp')) {
    return 'Email with meeting ask'
  }

  return 'Email or call'
}

export const getQueueBucket = (record: ProspectRecord) => {
  if (isRecordStale(record)) return 'stale'
  if (!record.owner.trim() || !hasDatedNextStep(record)) return 'research-needed'
  if (record.stage === 'Meeting booked') return 'meeting-booked'
  if (record.stage === 'Handoff ready') return 'handoff-ready'
  if (['Nurture', 'Disqualified'].includes(record.stage)) return 'nurture-disqualified'
  if (record.stage === 'New lead') return 'new-leads'
  if (!hasOutboundActivity(record)) return 'needs-first-touch'
  if (isFollowUpDueToday(record)) return 'follow-up-due'
  return 'needs-first-touch'
}

export const getQueueLabel = (record: ProspectRecord) => {
  const bucket = getQueueBucket(record)

  switch (bucket) {
    case 'stale':
      return 'Stale'
    case 'research-needed':
      return 'Research needed'
    case 'meeting-booked':
      return 'Meeting booked'
    case 'handoff-ready':
      return 'Handoff ready'
    case 'nurture-disqualified':
      return 'Nurture / disqualified'
    case 'new-leads':
      return 'New leads'
    case 'follow-up-due':
      return 'Follow-up due today'
    default:
      return 'Needs first touch'
  }
}

export const canMoveToStage = (
  record: ProspectRecord,
  stage: LeadStage,
  scenario?: ScenarioSeed,
): StageGateResult => {
  if (stage === 'Meeting booked') {
    if (!hasOutboundActivity(record) || !hasResponseOrMeetingActivity(record)) {
      return {
        allowed: false,
        message: 'Meeting booked requires outbound activity plus a reply or meeting event in the timeline.',
      }
    }
  }

  if (stage === 'Handoff ready') {
    const motion = getMicrosoftMotion(record, scenario)
    if (
      !record.owner.trim() ||
      !record.buyerPersona.trim() ||
      !record.lastTouchAt.trim() ||
      !hasDatedNextStep(record) ||
      motion === 'Mixed motion'
    ) {
      return {
        allowed: false,
        message:
          'Handoff ready requires owner, buyer persona, Microsoft fit, last touch, and a dated next step.',
      }
    }
  }

  if (stage === 'Disqualified' && !record.disqualificationReason.trim()) {
    return {
      allowed: false,
      message: 'Disqualified requires a reason code before the record can leave active work.',
    }
  }

  if (stage === 'Active' && (isRecordStale(record) || !hasDatedNextStep(record))) {
    return {
      allowed: false,
      message: 'Active records must have a current next step and cannot remain stale.',
    }
  }

  return {
    allowed: true,
    message: `${stage} stage is available.`,
  }
}

export const buildRoutingInsights = (record: ProspectRecord, scenario?: ScenarioSeed): RoutingInsights => {
  const motion = getMicrosoftMotion(record, scenario)
  const icpFit = getIcpFit(record, scenario)
  const recommendedChannel = getRecommendedChannel(record, scenario)
  const queueLabel = getQueueLabel(record)
  const dataHygieneRisk = getDataHygieneRisk(record)
  const stale = isRecordStale(record)
  const dueToday = isFollowUpDueToday(record)

  const icpMessage =
    icpFit === 'Strong'
      ? 'The segment, workload, and stated pain align well with a Microsoft desktop operations motion.'
      : icpFit === 'Moderate'
      ? 'The workload fit is real, but the account still needs sharper commercial context.'
      : 'The record needs clearer Microsoft-workload alignment before it should advance.'

  const microsoftMessage =
    motion === 'Mixed motion'
      ? 'The language spans multiple motions; tighten the workload story before handoff.'
      : `${motion} is the clearest match based on the current subject, use case, and pain points.`

  let urgencyHeadline = 'On-track cadence'
  let urgencyMessage = 'The next step is scheduled and the record is not stale.'

  if (stale) {
    urgencyHeadline = 'Stale record'
    urgencyMessage = 'No meaningful touch has landed for 14+ days, so this should not be treated as healthy active pipeline.'
  } else if (dueToday) {
    urgencyHeadline = 'Follow-up due today'
    urgencyMessage = 'The account has momentum, but the dated next step needs to happen today.'
  } else if (record.stage === 'Meeting booked') {
    urgencyHeadline = 'Protect meeting momentum'
    urgencyMessage = 'Keep the agenda and stakeholders tight so the booked meeting advances the deal.'
  }

  const handoffGate = canMoveToStage(record, 'Handoff ready', scenario)
  const handoffHeadline = handoffGate.allowed ? 'Handoff path viable' : 'Handoff not ready'
  const handoffMessage = handoffGate.allowed
    ? `Current handoff path: ${scenario?.handoffPlan.path.join(' → ') ?? 'SDR → AE'}.`
    : handoffGate.message

  const dataHygieneHeadline =
    dataHygieneRisk === 'High'
      ? 'Data hygiene risk: High'
      : dataHygieneRisk === 'Medium'
      ? 'Data hygiene risk: Medium'
      : 'Data hygiene risk: Low'

  const dataHygieneMessage =
    dataHygieneRisk === 'High'
      ? 'Fix ownership, next-step dating, or stale cadence before pushing this record forward.'
      : dataHygieneRisk === 'Medium'
      ? 'The record is workable but still needs stronger field coverage.'
      : 'The record is clean enough for active pipeline management.'

  return {
    queueLabel,
    queueReason:
      queueLabel === 'Research needed'
        ? 'Missing ownership or a dated next step forces this record back into cleanup.'
        : queueLabel === 'Stale'
        ? 'Time since the last touch pushes this record into stale review.'
        : queueLabel === 'Follow-up due today'
        ? 'The next touch is due today, so this belongs in the immediate follow-up lane.'
        : `This record currently fits the ${queueLabel.toLowerCase()} slice.`,
    icpHeadline: `ICP fit: ${icpFit}`,
    icpMessage,
    microsoftHeadline: `Microsoft relevance: ${motion}`,
    microsoftMessage,
    urgencyHeadline,
    urgencyMessage,
    channelHeadline: `Recommended channel: ${recommendedChannel}`,
    channelMessage: 'Use the channel mix that matches the motion and activity history rather than random follow-up.',
    handoffHeadline,
    handoffMessage,
    dataHygieneHeadline,
    dataHygieneMessage,
    microsoftMotion: motion,
    recommendedChannel,
    dataHygieneRisk,
  }
}
