import type { OutreachTemplate, OutreachTemplateCategory } from '../../types'

export const cannedCategoryOrder: OutreachTemplateCategory[] = [
  'first-touch',
  'follow-up',
  'objection-handling',
  'meeting-confirmation',
  'handoff-intro',
  'nurture',
]

export const cannedCategoryLabels: Record<OutreachTemplateCategory, string> = {
  'first-touch': 'First touch',
  'follow-up': 'Follow-up',
  'objection-handling': 'Objection handling',
  'meeting-confirmation': 'Meeting confirmation',
  'handoff-intro': 'Handoff intro',
  nurture: 'Nurture',
}

export const formatCannedText = (reply: OutreachTemplate) =>
  [reply.segments.opener, reply.segments.valueProp, reply.segments.nextStep].join('\n\n')
