import type {
  AiSuggestion,
  AiSuggestionKind,
  CRMHygieneReview,
  LeadStage,
  OutreachTemplate,
  OutreachTemplateCategory,
  PlaybookArticle,
  ProspectRecord,
  ScenarioSeed,
  Scorecard,
  ScoringRubric,
  ActivityType,
} from '../../types'
import type { GuidedEntry } from '../constants/subjectTriggers'
import type { RoutingInsights } from '../utils/routing'
import type { TimerStatus } from '../utils/timer'
import AIAssistPanel from './AIAssistPanel'
import ComposerPanel from './ComposerPanel'
import DeEscalationPanel from './DeEscalationPanel'
import GuidedTroubleshootingPanel from './GuidedTroubleshootingPanel'
import InternalNotesPanel from './InternalNotesPanel'
import KBSuggestionsPanel from './KBSuggestionsPanel'
import PostmortemPanel from './PostmortemPanel'
import ScorecardPanel from './ScorecardPanel'
import ThreadPanel from './ThreadPanel'
import TicketHeaderPanel from './TicketHeaderPanel'

export type ComposerProps = {
  selectedReplyId: string | null
  draftReply: string
  setDraftReply: (value: string) => void
  draftActivityType: ActivityType
  setDraftActivityType: (value: ActivityType) => void
  draftOutcome: string
  setDraftOutcome: (value: string) => void
  draftNextStep: string
  setDraftNextStep: (value: string) => void
  draftNextTouchDueAt: string
  setDraftNextTouchDueAt: (value: string) => void
  draftCrmUpdated: boolean
  setDraftCrmUpdated: (value: boolean) => void
  selectedCannedReply: OutreachTemplate | null
  cannedRepliesByCategory: Record<OutreachTemplateCategory, OutreachTemplate[]>
  cannedCategoryLabels: Record<OutreachTemplateCategory, string>
  cannedCategoryOrder: OutreachTemplateCategory[]
  requiresCannedEdit: boolean
  handleLogActivity: () => void
  handleUseCannedReply: (id: string) => void
  playbookSuggestions: PlaybookArticle[]
  selectedArticleId: string | null
  setSelectedArticleId: (value: string | null) => void
  handleShareSelectedArticle: () => void
  setSelectedReplyId: (value: string | null) => void
}

type TimelineProps = {
  activities: ProspectRecord['activities']
  aiSummary: string
  recommendedNextAction: string
  stageOptions: LeadStage[]
  selectedStage: LeadStage
  setSelectedStage: (value: LeadStage) => void
  onApplyStageChange: () => void
}

type SidebarProps = {
  rubric: ScoringRubric
  scorecard: Scorecard
  review: CRMHygieneReview
  owner: string
  buyerPersona: string
  nextTouchDueAt: string
  disqualificationReason: string
  narrativeFields: readonly (keyof CRMHygieneReview)[]
  fieldLabels: Record<keyof CRMHygieneReview, string>
  handleReviewChange: (field: keyof CRMHygieneReview, value: string) => void
  handleRecordFieldChange: (
    field: 'owner' | 'buyerPersona' | 'nextTouchDueAt' | 'disqualificationReason',
    value: string,
  ) => void
  guidedResearch: GuidedEntry[]
  playbookSuggestions: PlaybookArticle[]
  handleSharePlaybook: (article: PlaybookArticle) => void
  aiSuggestion: AiSuggestion | null
  handleGenerateAiSuggestion: (kind: AiSuggestionKind) => void
  handleApplyAiSuggestion: () => void
}

type Props = {
  selectedRecord: ProspectRecord | undefined
  selectedScenario?: ScenarioSeed
  routingInsights: RoutingInsights | null
  countdownLabel: string
  timerStatus: TimerStatus
  timerDescription: string
  executionScorecard: Scorecard | null
  executionMaxTotal: number
  composer: ComposerProps
  timeline: TimelineProps
  researchActivities: ProspectRecord['activities']
  sidebar?: SidebarProps
}

const TicketDetailWorkspace = ({
  selectedRecord,
  selectedScenario,
  routingInsights,
  countdownLabel,
  timerStatus,
  timerDescription,
  executionScorecard,
  executionMaxTotal,
  composer,
  timeline,
  researchActivities,
  sidebar,
}: Props) => (
  <section className="detail-column">
    <div className="detail-headline">
      <p className="eyebrow">Account workspace</p>
      <p className="hero-blurb">Open any record to reveal the timeline, AI assist, playbooks, and CRM hygiene tools.</p>
    </div>
    {selectedRecord ? (
      <section className="ticket-shell">
        <TicketHeaderPanel
          record={selectedRecord}
          scenario={selectedScenario}
          routingInsights={routingInsights}
          countdownLabel={countdownLabel}
          timerStatus={timerStatus}
          timerDescription={timerDescription}
        />
        <div className="ticket-grid">
          <section className="thread-column">
            <ThreadPanel {...timeline} />
            <ComposerPanel {...composer} />
            {executionScorecard && (
              <DeEscalationPanel scorecard={executionScorecard} maxTotal={executionMaxTotal} />
            )}
            <InternalNotesPanel researchActivities={researchActivities} />
          </section>
          <aside className="sidebar">
            {sidebar && (
              <>
                <ScorecardPanel scorecard={selectedRecord.scorecard} rubric={sidebar.rubric} />
                <AIAssistPanel
                  aiSuggestion={sidebar.aiSuggestion}
                  onGenerate={sidebar.handleGenerateAiSuggestion}
                  onApply={sidebar.handleApplyAiSuggestion}
                />
                <PostmortemPanel
                  review={sidebar.review}
                  owner={sidebar.owner}
                  buyerPersona={sidebar.buyerPersona}
                  nextTouchDueAt={sidebar.nextTouchDueAt}
                  disqualificationReason={sidebar.disqualificationReason}
                  narrativeFields={sidebar.narrativeFields}
                  fieldLabels={sidebar.fieldLabels}
                  onChange={sidebar.handleReviewChange}
                  onRecordFieldChange={sidebar.handleRecordFieldChange}
                />
                <GuidedTroubleshootingPanel
                  guidedResearch={sidebar.guidedResearch}
                  handleSharePlaybook={sidebar.handleSharePlaybook}
                />
                <KBSuggestionsPanel
                  playbookSuggestions={sidebar.playbookSuggestions}
                  handleSharePlaybook={sidebar.handleSharePlaybook}
                />
              </>
            )}
          </aside>
        </div>
      </section>
    ) : (
      <div className="detail-empty" role="status" aria-live="polite">
        <p>Select a record from the queue to load the workspace.</p>
        <p>Need a record? Use the reset button or clear your filters to repopulate the queue.</p>
      </div>
    )}
  </section>
)

export default TicketDetailWorkspace
