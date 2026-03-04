import { scoringRubric } from '../data'
import { useDeskState } from './hooks/useDeskState'
import type { PostmortemSection } from '../types'
import AppHeader from './components/AppHeader'
import QueueNav from './components/QueueNav'
import TicketColumn from './components/TicketColumn'
import TicketDetailWorkspace, { type ComposerProps } from './components/TicketDetailWorkspace'
import ScenarioLibrary from './components/ScenarioLibrary'
import WalkthroughOverlay from './components/WalkthroughOverlay'
import Toast from './components/Toast'
import './styles/layout.css'
import './styles/tickets.css'
import './styles/detail.css'
import './styles/panel.css'
import './styles/conversation.css'
import './styles/sidebar.css'

const DeskApp = () => {
  const {
    scenarioCatalog,
    queueViews,
    viewCounts,
    activeView,
    selectedViewId,
    setSelectedViewId,
    filteredTickets,
    jumpTargetId,
    searchTerm,
    setSearchTerm,
    handleSelectTicket,
    handleReset,
    handleToggleScenarioLibrary,
    handleToggleWalkthrough,
    showScenarioLibrary,
    walkthroughActive,
    selectedTicket,
    selectedScenario,
    routingInsights,
    selectedCountdownLabel,
    selectedTimerStatus,
    selectedTimerDescription,
    deEscalationScorecard,
    deEscalationMaxTotal,
    selectedReplyId,
    draftReply,
    setDraftReply,
    draftAudience,
    setDraftAudience,
    selectedCannedReply,
    cannedRepliesByCategory,
    cannedCategoryLabels,
    cannedCategoryOrder,
    requiresCannedEdit,
    handleSendReply,
    handleUseCannedReply,
    setSelectedReplyId,
    selectedArticleId,
    setSelectedArticleId,
    kbSuggestions,
    handleShareSelectedArticle,
    handleShareKB,
    handleStatusAction,
    postmortemNarrativeFields,
    postmortemFieldLabels,
    handlePostmortemChange,
    postmortemChecklist,
    guidedTroubleshooting,
    caseCloseReady,
    toastMessage,
    handleWalkthroughKeyDown,
    scenarioMap,
  } = useDeskState()

  const composerProps: ComposerProps = {
    selectedReplyId,
    draftReply,
    setDraftReply,
    draftAudience,
    setDraftAudience,
    selectedCannedReply,
    cannedRepliesByCategory,
    cannedCategoryLabels,
    cannedCategoryOrder,
    requiresCannedEdit,
    handleSendReply,
    handleUseCannedReply,
    selectedArticleId,
    setSelectedArticleId,
    kbSuggestions,
    handleShareSelectedArticle,
    setSelectedReplyId,
  }

  const postmortemLabels: Record<keyof PostmortemSection, string> = {
    ...postmortemFieldLabels,
    knowledgeArticleStatus: 'Article created or updated?',
  }

  const threadProps = {
    thread: selectedTicket?.thread ?? [],
    postmortemChecklist,
    caseCloseReady,
    onStatusAction: handleStatusAction,
  }

  const sidebarProps = selectedTicket
    ? {
        rubric: scoringRubric,
        scorecard: selectedTicket.scorecard,
        postmortem: selectedTicket.postmortem,
        narrativeFields: postmortemNarrativeFields,
        fieldLabels: postmortemLabels,
        handlePostmortemChange,
        guidedTroubleshooting,
        kbSuggestions,
        handleShareKB,
      }
    : undefined

  return (
    <div className="app-shell">
      <AppHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        jumpTargetId={jumpTargetId}
        scenarioCatalog={scenarioCatalog}
        onSelectTicket={handleSelectTicket}
        onReset={handleReset}
        onToggleScenarioLibrary={handleToggleScenarioLibrary}
        onToggleWalkthrough={handleToggleWalkthrough}
      />
      <div className="workspace-grid">
        <QueueNav
          views={queueViews}
          activeViewId={selectedViewId}
          viewCounts={viewCounts}
          matchingCount={filteredTickets.length}
          onSelectView={setSelectedViewId}
        />
        <TicketColumn
          activeView={activeView}
          filteredTickets={filteredTickets}
          scenarioMap={scenarioMap}
          selectedTicketId={selectedTicket?.id}
          onSelectTicket={handleSelectTicket}
        />
        <TicketDetailWorkspace
          selectedTicket={selectedTicket}
          selectedScenario={selectedScenario}
          routingInsights={routingInsights}
          countdownLabel={selectedCountdownLabel}
          timerStatus={selectedTimerStatus}
          timerDescription={selectedTimerDescription}
          deEscalationScorecard={deEscalationScorecard}
          deEscalationMaxTotal={deEscalationMaxTotal}
          composer={composerProps}
          thread={threadProps}
          sidebar={sidebarProps}
        />
      </div>
      {showScenarioLibrary && (
        <ScenarioLibrary scenarios={scenarioCatalog} onSelectScenario={handleSelectTicket} />
      )}
      {walkthroughActive && selectedScenario && (
        <WalkthroughOverlay
          scenario={selectedScenario}
          ticket={selectedTicket}
          onClose={handleToggleWalkthrough}
          onKeyDown={handleWalkthroughKeyDown}
        />
      )}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default DeskApp
