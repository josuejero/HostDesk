import type { CannedReply, CannedReplyCategory } from '../../types'

export const cannedCategoryOrder: CannedReplyCategory[] = [
  'acknowledgement',
  'billing-clarification',
  'troubleshooting-step-request',
  'outage-acknowledgment',
  'upgrade-reassurance',
  'escalation-handoff',
  'closure-follow-up',
]

export const cannedCategoryLabels: Record<CannedReplyCategory, string> = {
  acknowledgement: 'Acknowledgement',
  'billing-clarification': 'Billing clarification',
  'troubleshooting-step-request': 'Troubleshooting step request',
  'outage-acknowledgment': 'Outage acknowledgment',
  'upgrade-reassurance': 'Upgrade reassurance',
  'escalation-handoff': 'Escalation handoff',
  'closure-follow-up': 'Closure / follow-up',
}

export const formatCannedText = (reply: CannedReply) =>
  [reply.segments.acknowledgment, reply.segments.ownership, reply.segments.nextStep].join('\n\n')
