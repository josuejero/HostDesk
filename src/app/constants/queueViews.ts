import type { ProspectRecord, ScenarioSeed } from '../../types'
import {
  hasDatedNextStep,
  hasOutboundActivity,
  isFollowUpDueToday,
  isRecordStale,
} from '../utils/routing'

export type ViewDefinition = {
  id: string
  label: string
  description: string
  filter: (record: ProspectRecord, scenario?: ScenarioSeed) => boolean
}

export const queueViews: ViewDefinition[] = [
  {
    id: 'new-leads',
    label: 'New leads',
    description: 'Fresh records that still need intake and qualification context.',
    filter: (record) => record.stage === 'New lead',
  },
  {
    id: 'needs-first-touch',
    label: 'Needs first touch',
    description: 'Records with no outbound email, call, or LinkedIn motion yet.',
    filter: (record) =>
      !hasOutboundActivity(record) && !['Nurture', 'Disqualified', 'Handoff ready'].includes(record.stage),
  },
  {
    id: 'follow-up-due',
    label: 'Follow-up due today',
    description: 'Active records whose next step is due today.',
    filter: (record) => isFollowUpDueToday(record) && !isRecordStale(record),
  },
  {
    id: 'stale',
    label: 'Stale',
    description: 'No meaningful touch in 14+ days.',
    filter: (record) => isRecordStale(record),
  },
  {
    id: 'research-needed',
    label: 'Research needed',
    description: 'Missing owner, missing next step, or otherwise not pipeline-safe.',
    filter: (record) => !record.owner.trim() || !hasDatedNextStep(record),
  },
  {
    id: 'meeting-booked',
    label: 'Meeting booked',
    description: 'Records with a confirmed meeting on the board.',
    filter: (record) => record.stage === 'Meeting booked',
  },
  {
    id: 'handoff-ready',
    label: 'Handoff ready',
    description: 'Ready for a cleaner AE or specialist handoff.',
    filter: (record) => record.stage === 'Handoff ready',
  },
  {
    id: 'nurture-disqualified',
    label: 'Nurture / disqualified',
    description: 'Records intentionally parked or removed from active work.',
    filter: (record) => ['Nurture', 'Disqualified'].includes(record.stage),
  },
]
