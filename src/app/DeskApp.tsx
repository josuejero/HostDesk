import { useState } from 'react'
import { scoringRubric } from '../data'
import { useLocalStorageState } from '../hooks/useLocalStorageState'
import { useMetrics } from '../api/hooks'
import AppHeader from './components/AppHeader'
import QueueNav from './components/QueueNav'
import ScenarioLibrary from './components/ScenarioLibrary'
import TicketColumn from './components/TicketColumn'
import TicketDetailWorkspace, { type ComposerProps } from './components/TicketDetailWorkspace'
import Toast from './components/Toast'
import WalkthroughOverlay from './components/WalkthroughOverlay'
import MetricsDashboard from './components/metrics/MetricsDashboard'
import { useDeskState } from './hooks/useDeskState'
import './styles/layout.css'
import './styles/tickets.css'
import './styles/detail.css'
import './styles/panel.css'
import './styles/conversation.css'
import './styles/sidebar.css'
import '../index.css'
import type { MetricsRange, SessionState } from '../types'

type Props = {
  session?: SessionState
  onLogout?: () => void
}

const fallbackSession: SessionState = {
  authenticated: true,
  user: {
    id: '1',
    email: 'demo@hostdesk.local',
    displayName: 'HostDesk Demo',
    createdAt: '2026-03-01T00:00:00.000Z',
    lastLoginAt: '2026-03-29T12:00:00.000Z',
  },
  csrfToken: 'test-csrf-token',
}

const DeskApp = ({ session = fallbackSession, onLogout = () => {} }: Props) => {
  const [activeSurface, setActiveSurface] = useLocalStorageState<'workspace' | 'metrics'>('hostdesk-ui-surface', () => 'workspace')
  const [metricsRange, setMetricsRange] = useState<MetricsRange>('30d')
  const {
    scenarioCatalog,
    queueViews,
    viewCounts,
    activeView,
    selectedViewId,
    setSelectedViewId,
    filteredRecords,
    jumpTargetId,
    searchTerm,
    setSearchTerm,
    handleSelectRecord,
    handleReset,
    handleToggleScenarioLibrary,
    handleToggleWalkthrough,
    showScenarioLibrary,
    walkthroughActive,
    selectedRecord,
    selectedScenario,
    routingInsights,
    selectedCountdownLabel,
    selectedTimerStatus,
    selectedTimerDescription,
    executionScorecard,
    executionMaxTotal,
    selectedReplyId,
    draftReply,
    setDraftReply,
    draftActivityType,
    setDraftActivityType,
    draftOutcome,
    setDraftOutcome,
    draftNextStep,
    setDraftNextStep,
    draftNextTouchDueAt,
    setDraftNextTouchDueAt,
    draftCrmUpdated,
    setDraftCrmUpdated,
    selectedCannedReply,
    cannedRepliesByCategory,
    cannedCategoryLabels,
    cannedCategoryOrder,
    requiresCannedEdit,
    handleLogActivity,
    handleUseCannedReply,
    setSelectedReplyId,
    selectedArticleId,
    setSelectedArticleId,
    playbookSuggestions,
    handleShareSelectedArticle,
    handleSharePlaybook,
    reviewNarrativeFields,
    reviewFieldLabels,
    handleReviewChange,
    guidedResearch,
    researchActivities,
    stageOptions,
    selectedStage,
    setSelectedStage,
    handleApplyStageChange,
    handleRecordFieldChange,
    aiSuggestion,
    handleGenerateAiSuggestion,
    handleApplyAiSuggestion,
    toastMessage,
    handleWalkthroughKeyDown,
    scenarioMap,
    nextTouchInputValue,
    workspaceLoading,
    workspaceError,
  } = useDeskState(session)
  const { metrics, isLoading: metricsLoading, error: metricsError, refresh: refreshMetrics } = useMetrics(
    metricsRange,
    session.authenticated && activeSurface === 'metrics',
  )

  const composerProps: ComposerProps = {
    selectedReplyId,
    draftReply,
    setDraftReply,
    draftActivityType,
    setDraftActivityType,
    draftOutcome,
    setDraftOutcome,
    draftNextStep,
    setDraftNextStep,
    draftNextTouchDueAt,
    setDraftNextTouchDueAt,
    draftCrmUpdated,
    setDraftCrmUpdated,
    selectedCannedReply,
    cannedRepliesByCategory,
    cannedCategoryLabels,
    cannedCategoryOrder,
    requiresCannedEdit,
    handleLogActivity,
    handleUseCannedReply,
    playbookSuggestions,
    selectedArticleId,
    setSelectedArticleId,
    handleShareSelectedArticle,
    setSelectedReplyId,
  }

  const timelineProps = selectedRecord
    ? {
        activities: selectedRecord.activities,
        aiSummary: selectedRecord.aiSummary,
        recommendedNextAction: selectedRecord.recommendedNextAction,
        stageOptions,
        selectedStage,
        setSelectedStage,
        onApplyStageChange: handleApplyStageChange,
      }
    : undefined

  const sidebarProps = selectedRecord
    ? {
        rubric: scoringRubric,
        scorecard: selectedRecord.scorecard,
        review: selectedRecord.review,
        owner: selectedRecord.owner,
        buyerPersona: selectedRecord.buyerPersona,
        nextTouchDueAt: nextTouchInputValue,
        disqualificationReason: selectedRecord.disqualificationReason,
        narrativeFields: reviewNarrativeFields,
        fieldLabels: {
          ...reviewFieldLabels,
          playbookStatus: 'Playbook updated?',
        },
        handleReviewChange,
        handleRecordFieldChange,
        guidedResearch,
        playbookSuggestions,
        handleSharePlaybook,
        aiSuggestion,
        handleGenerateAiSuggestion,
        handleApplyAiSuggestion,
      }
    : undefined

  return (
    <div className="app-shell">
      <AppHeader
        activeSurface={activeSurface}
        onSetActiveSurface={setActiveSurface}
        currentUserName={session.user?.displayName ?? 'HostDesk user'}
        onLogout={onLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        jumpTargetId={jumpTargetId}
        scenarioCatalog={scenarioCatalog}
        onSelectRecord={handleSelectRecord}
        onReset={handleReset}
        onToggleScenarioLibrary={handleToggleScenarioLibrary}
        onToggleWalkthrough={handleToggleWalkthrough}
      />
      {activeSurface === 'workspace' ? (
        <>
          {workspaceError && <p className="workspace-banner">{workspaceError}</p>}
          {workspaceLoading && <p className="workspace-banner">Loading saved records from the API...</p>}
          <div className="workspace-grid">
            <QueueNav
              views={queueViews}
              activeViewId={selectedViewId}
              viewCounts={viewCounts}
              matchingCount={filteredRecords.length}
              onSelectView={setSelectedViewId}
            />
            <TicketColumn
              activeView={activeView}
              filteredRecords={filteredRecords}
              scenarioMap={scenarioMap}
              selectedRecordId={selectedRecord?.id}
              onSelectRecord={handleSelectRecord}
            />
            <TicketDetailWorkspace
              selectedRecord={selectedRecord}
              selectedScenario={selectedScenario}
              routingInsights={routingInsights}
              countdownLabel={selectedCountdownLabel}
              timerStatus={selectedTimerStatus}
              timerDescription={selectedTimerDescription}
              executionScorecard={executionScorecard}
              executionMaxTotal={executionMaxTotal}
              composer={composerProps}
              timeline={timelineProps!}
              researchActivities={researchActivities}
              sidebar={sidebarProps}
            />
          </div>
          {showScenarioLibrary && (
            <ScenarioLibrary scenarios={scenarioCatalog} onSelectScenario={handleSelectRecord} />
          )}
          {walkthroughActive && selectedScenario && (
            <WalkthroughOverlay
              scenario={selectedScenario}
              record={selectedRecord}
              onClose={handleToggleWalkthrough}
              onKeyDown={handleWalkthroughKeyDown}
            />
          )}
        </>
      ) : (
        <MetricsDashboard
          metrics={metrics}
          range={metricsRange}
          onRangeChange={setMetricsRange}
          onRefresh={() => {
            void refreshMetrics()
          }}
          isLoading={metricsLoading}
          error={metricsError}
        />
      )}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default DeskApp
