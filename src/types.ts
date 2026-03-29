export type ActivityType =
  | 'outbound-email'
  | 'call-attempt'
  | 'linkedin-touch'
  | 'reply-received'
  | 'meeting-booked'
  | 'enrichment-update'
  | 'ownership-changed'
  | 'stage-changed'
  | 'ai-draft-used'
  | 'note-added'

export type ActivityChannel = 'email' | 'call' | 'linkedin' | 'meeting' | 'crm' | 'internal'

export interface ActivityEntry {
  id: string
  type: ActivityType
  owner: string
  timestamp: string
  channel: ActivityChannel
  outcome: string
  summary: string
  nextStep: string
  crmUpdated: boolean
}

export type PlaybookStatus = 'updated' | 'not-needed' | ''

export interface CRMHygieneReview {
  deduplication: string
  stageCriteria: string
  nextStepPlan: string
  handoffNotes: string
  playbookStatus: PlaybookStatus
}

export interface ScorecardMetric {
  id: string
  label: string
  value: number
  max: number
  note: string
}

export interface Scorecard {
  total: number
  metrics: ScorecardMetric[]
}

export type LeadStage =
  | 'New lead'
  | 'Active'
  | 'Meeting booked'
  | 'Handoff ready'
  | 'Nurture'
  | 'Disqualified'

export interface ProspectRecord {
  id: string
  subject: string
  company: string
  segment: string
  employeeRange: string
  microsoftFootprint: string[]
  useCase: string
  buyerPersona: string
  leadSource: string
  owner: string
  stage: LeadStage
  stageEnteredAt: string
  createdAt: string
  lastTouchAt: string
  nextTouchDueAt: string
  painPoints: string[]
  objections: string[]
  buyingSignals: string[]
  activities: ActivityEntry[]
  playbookMatches: string[]
  review: CRMHygieneReview
  scorecard: Scorecard
  aiSummary: string
  recommendedNextAction: string
  crmCompleteness: number
  disqualificationReason: string
}

export interface AccountProfile {
  accountId: string
  name: string
  timezone: string
  region: string
  existingStack: string
  microsoftPriority: string
  motion: string
}

export interface HandoffPlan {
  currentPath: string
  path: string[]
  notes: string
}

export interface ScenarioSeed {
  id: string
  bucket: string
  title: string
  description: string
  tags: string[]
  record: ProspectRecord
  accountProfile: AccountProfile
  handoffPlan: HandoffPlan
}

export interface PlaybookArticle {
  id: string
  title: string
  summary: string
  keywords: string[]
  labels?: string[]
  focusArea: string
  link: string
  audience?: string
}

export type OutreachTemplateCategory =
  | 'first-touch'
  | 'follow-up'
  | 'objection-handling'
  | 'meeting-confirmation'
  | 'handoff-intro'
  | 'nurture'

export interface OutreachTemplate {
  id: string
  title: string
  tone: string
  category: OutreachTemplateCategory
  segments: {
    opener: string
    valueProp: string
    nextStep: string
  }
  editable: boolean
  keywords: string[]
}

export interface ScoringMetric {
  id: string
  label: string
  weight: number
  max: number
  description: string
  suggestion: string
}

export interface ScoringRubric {
  version: string
  focus: string
  metrics: ScoringMetric[]
}

export type AiSuggestionKind = 'summary' | 'next-step' | 'draft'

export interface AiSuggestion {
  kind: AiSuggestionKind
  headline: string
  body: string
  applied: boolean
}

export interface DemoState {
  records: ProspectRecord[]
  selectedRecordId: string
  walkthroughActive: boolean
  showScenarioLibrary: boolean
}
