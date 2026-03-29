import { scenarioCatalog } from '../../data'
import type { ActivityEntry, DemoState, ProspectRecord } from '../../types'
import { buildOperationalScorecard } from './scorecard'

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const cloneRecord = (record: ProspectRecord) => JSON.parse(JSON.stringify(record)) as ProspectRecord

export const getInitialState = (): DemoState => {
  const cloned = scenarioCatalog.map((scenario) => {
    const record = cloneRecord(scenario.record)
    return {
      ...record,
      scorecard: buildOperationalScorecard(record, scenario),
    }
  })

  return {
    records: cloned,
    selectedRecordId: cloned[0]?.id ?? '',
    walkthroughActive: false,
    showScenarioLibrary: false,
  }
}

export const isResearchActivity = (activity: ActivityEntry) =>
  ['note-added', 'enrichment-update', 'ownership-changed'].includes(activity.type)

export const isExternalActivity = (activity: ActivityEntry) =>
  ['outbound-email', 'call-attempt', 'linkedin-touch', 'reply-received', 'meeting-booked', 'ai-draft-used'].includes(
    activity.type,
  )
