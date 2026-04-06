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
  persistedId?: string
  externalKey?: string
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
  notes?: Note[]
  cadenceTasks?: CadenceTask[]
  stageHistory?: StageHistoryEntry[]
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

export interface SessionUser {
  id: string
  email: string
  displayName: string
  createdAt: string
  lastLoginAt: string | null
}

export interface SessionState {
  authenticated: boolean
  user: SessionUser | null
  csrfToken: string | null
}

export interface Note {
  id: string
  authorUserId: string
  authorName: string
  body: string
  createdAt: string
}

export type CadenceTaskStatus = 'open' | 'completed' | 'skipped'

export interface CadenceTask {
  id: string
  prospectId: string
  stepName: string
  channel: string
  dueAt: string
  completedAt: string | null
  status: CadenceTaskStatus
}

export interface StageHistoryEntry {
  id: string
  prospectId: string
  fromStage: string | null
  toStage: string
  changedByUserId: string
  changedByName: string
  changedAt: string
}

export interface ProspectSummary {
  id: string
  externalKey: string
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
  playbookMatches: string[]
  review: CRMHygieneReview
  aiSummary: string
  recommendedNextAction: string
  crmCompleteness: number
  disqualificationReason: string
}

export interface ProspectDetail extends ProspectSummary {
  activities: ActivityEntry[]
  notes: Note[]
  cadenceTasks: CadenceTask[]
  stageHistory: StageHistoryEntry[]
}

export type MetricsRange = '7d' | '30d'

export interface StageConversionMetric {
  fromStage: string | null
  toStage: string
  convertedProspects: number
  conversionPct: number | null
}

export interface OverdueTaskItem {
  company: string
  owner: string
  stepName: string
  dueAt: string
}

export interface MetricsSnapshot {
  range: MetricsRange
  responseRatePct: number
  stageConversions: StageConversionMetric[]
  overdueFollowups: number
  tasksDueToday: number
  meetingsBooked: number
  overdueItems: OverdueTaskItem[]
}
