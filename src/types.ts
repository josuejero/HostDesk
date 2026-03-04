export type Audience = 'customer' | 'internal'

export interface ThreadEntry {
  id: string
  author: string
  audience: Audience
  createdAt: string
  message: string
}

export interface PostmortemSection {
  rootCause: string
  fix: string
  followUp: string
  prevention: string
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

export interface Ticket {
  id: string
  subject: string
  department: string
  severity: string
  priority: string
  status: string
  plan: string
  slaTargetMinutes: number
  createdAt: string
  assignedTo: string
  escalationTier: string
  invoiceState: string
  recentIncidents: string[]
  thread: ThreadEntry[]
  internalNotes: ThreadEntry[]
  kbMatches: string[]
  postmortem: PostmortemSection
  scorecard: Scorecard
}

export interface CustomerProfile {
  accountId: string
  name: string
  planTier: string
  persona: string
  billingCycle: string
  slaEntitlementMinutes: number
  timezone: string
  serverRegion: string
}

export interface EscalationRules {
  currentTier: string
  path: string[]
  notes: string
}

export interface ScenarioSeed {
  id: string
  bucket: string
  title: string
  description: string
  tags: string[]
  ticket: Ticket
  customerProfile: CustomerProfile
  escalationRules: EscalationRules
}

export interface KBArticle {
  id: string
  title: string
  summary: string
  keywords: string[]
  link: string
}

export interface CannedReply {
  id: string
  title: string
  tone: string
  body: string
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

export interface DemoState {
  tickets: Ticket[]
  selectedTicketId: string
  walkthroughActive: boolean
  showScenarioLibrary: boolean
}
