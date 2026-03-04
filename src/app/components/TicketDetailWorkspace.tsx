import type { Audience, CannedReply, CannedReplyCategory, KBArticle, PostmortemSection, ScenarioSeed, Scorecard, ScoringRubric, Ticket } from '../../types'
import type { RoutingInsights } from '../utils/routing'
import type { TimerStatus } from '../utils/timer'
import TicketHeaderPanel from './TicketHeaderPanel'
import ThreadPanel from './ThreadPanel'
import ComposerPanel from './ComposerPanel'
import DeEscalationPanel from './DeEscalationPanel'
import InternalNotesPanel from './InternalNotesPanel'
import ScorecardPanel from './ScorecardPanel'
import PostmortemPanel from './PostmortemPanel'
import GuidedTroubleshootingPanel from './GuidedTroubleshootingPanel'
import KBSuggestionsPanel from './KBSuggestionsPanel'
import type { GuidedEntry } from '../constants/subjectTriggers'

export type ComposerProps = {
  selectedReplyId: string | null
  draftReply: string
  setDraftReply: (value: string) => void
  draftAudience: Audience
  setDraftAudience: (value: Audience) => void
  selectedCannedReply: CannedReply | null
  cannedRepliesByCategory: Record<CannedReplyCategory, CannedReply[]>
  cannedCategoryLabels: Record<CannedReplyCategory, string>
  cannedCategoryOrder: CannedReplyCategory[]
  requiresCannedEdit: boolean
  handleSendReply: () => void
  handleUseCannedReply: (id: string) => void
  selectedArticleId: string | null
  setSelectedArticleId: (value: string | null) => void
  kbSuggestions: KBArticle[]
  handleShareSelectedArticle: () => void
  setSelectedReplyId: (value: string | null) => void
}

type ThreadProps = {
  thread: Ticket['thread']
  postmortemChecklist: { id: string; label: string; detail: string; complete: boolean }[]
  caseCloseReady: boolean
  onStatusAction: (action: 'waiting' | 'solved') => void
}

type SidebarProps = {
  rubric: ScoringRubric
  scorecard: Scorecard
  postmortem: PostmortemSection
  narrativeFields: readonly (keyof PostmortemSection)[]
  fieldLabels: Record<keyof PostmortemSection, string>
  handlePostmortemChange: (field: keyof Ticket['postmortem'], value: string) => void
  guidedTroubleshooting: GuidedEntry[]
  kbSuggestions: KBArticle[]
  handleShareKB: (article: KBArticle) => void
}

type Props = {
  selectedTicket: Ticket | undefined
  selectedScenario?: ScenarioSeed
  routingInsights: RoutingInsights | null
  countdownLabel: string
  timerStatus: TimerStatus
  timerDescription: string
  deEscalationScorecard: Scorecard | null
  deEscalationMaxTotal: number
  composer: ComposerProps
  thread: ThreadProps
  sidebar?: SidebarProps
}

const TicketDetailWorkspace = ({
  selectedTicket,
  selectedScenario,
  routingInsights,
  countdownLabel,
  timerStatus,
  timerDescription,
  deEscalationScorecard,
  deEscalationMaxTotal,
  composer,
  thread,
  sidebar,
}: Props) => (
  <section className="detail-column">
    <div className="detail-headline">
      <p className="eyebrow">Case workspace</p>
      <p className="hero-blurb">Open any ticket to reveal threads, scorecard, KB, and postmortem tools.</p>
    </div>
    {selectedTicket ? (
      <section className="ticket-shell">
        <TicketHeaderPanel
          ticket={selectedTicket}
          scenario={selectedScenario}
          routingInsights={routingInsights}
          countdownLabel={countdownLabel}
          timerStatus={timerStatus}
          timerDescription={timerDescription}
        />
        <div className="ticket-grid">
          <section className="thread-column">
            <ThreadPanel {...thread} />
            <ComposerPanel {...composer} />
            {deEscalationScorecard && (
              <DeEscalationPanel scorecard={deEscalationScorecard} maxTotal={deEscalationMaxTotal} />
            )}
            <InternalNotesPanel internalNotes={selectedTicket.internalNotes} />
          </section>
          <aside className="sidebar">
            {sidebar && (
              <>
                <ScorecardPanel scorecard={selectedTicket.scorecard} rubric={sidebar.rubric} />
                <PostmortemPanel
                  postmortem={sidebar.postmortem}
                  narrativeFields={sidebar.narrativeFields}
                  fieldLabels={sidebar.fieldLabels}
                  onChange={sidebar.handlePostmortemChange}
                />
                <GuidedTroubleshootingPanel
                  guidedTroubleshooting={sidebar.guidedTroubleshooting}
                  handleShareKB={sidebar.handleShareKB}
                />
                <KBSuggestionsPanel kbSuggestions={sidebar.kbSuggestions} handleShareKB={sidebar.handleShareKB} />
              </>
            )}
          </aside>
        </div>
      </section>
    ) : (
      <div className="detail-empty" role="status" aria-live="polite">
        <p>Select a ticket from the queue to load the workspace.</p>
        <p>Need a ticket? Use the reset button or clear your filters to repopulate the queue.</p>
      </div>
    )}
  </section>
)

export default TicketDetailWorkspace
