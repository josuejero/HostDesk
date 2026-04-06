import { act, renderHook, waitFor } from '@testing-library/react'
import { useDeskState } from './useDeskState'

describe('useDeskState hook interactions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('selects a record and hides the scenario library', async () => {
    const { result } = renderHook(() => useDeskState())
    await waitFor(() => expect(result.current.workspaceLoading).toBe(false))
    expect(result.current.selectedRecord?.id).toBeDefined()
    const secondRecordId = result.current.scenarioCatalog[1].record.id

    await act(async () => {
      result.current.handleToggleScenarioLibrary()
      result.current.handleSelectRecord(secondRecordId)
      await vi.runAllTimersAsync()
    })

    expect(result.current.selectedRecord?.id).toBe(secondRecordId)
    expect(result.current.showScenarioLibrary).toBe(false)
  })

  it('requires outreach templates to be personalized before logging activity', async () => {
    const { result } = renderHook(() => useDeskState())
    await waitFor(() => expect(result.current.workspaceLoading).toBe(false))
    expect(result.current.selectedRecord?.id).toBeDefined()
    const firstCategory = result.current.cannedCategoryOrder[0]
    const template = result.current.cannedRepliesByCategory[firstCategory][0]
    const initialActivities = result.current.selectedRecord?.activities.length ?? 0

    act(() => {
      result.current.handleUseCannedReply(template.id)
    })

    expect(result.current.requiresCannedEdit).toBe(true)

    await act(async () => {
      await result.current.handleLogActivity()
    })

    expect(result.current.toastMessage).toMatch(/Edit the outreach template/)
    expect(result.current.selectedRecord?.activities.length).toBe(initialActivities)

    act(() => {
      result.current.setDraftReply('Personalized follow-up tied to this account.')
    })

    await act(async () => {
      await result.current.handleLogActivity()
    })

    expect(result.current.selectedRecord?.activities.length).toBe(initialActivities + 1)
    expect(result.current.draftReply).toBe('')
    expect(result.current.selectedReplyId).toBeNull()
  })

  it('saves matched playbooks onto the record and logs a note', async () => {
    const { result } = renderHook(() => useDeskState())
    await waitFor(() => expect(result.current.workspaceLoading).toBe(false))
    expect(result.current.selectedRecord?.id).toBeDefined()
    if (!result.current.playbookSuggestions.length) {
      throw new Error('Expected playbook suggestions for the default record')
    }

    const articleId = result.current.playbookSuggestions[0].id
    const activityLength = result.current.selectedRecord?.activities.length ?? 0

    act(() => {
      result.current.setSelectedArticleId(articleId)
      result.current.handleShareSelectedArticle()
    })

    await waitFor(() => expect(result.current.selectedRecord?.playbookMatches).toContain(articleId))
    expect(result.current.selectedRecord?.activities.length).toBe(activityLength + 1)
    expect(result.current.toastMessage).toContain('Added')
  })

  it('blocks handoff-ready until required fields are filled', async () => {
    const { result } = renderHook(() => useDeskState())
    await waitFor(() => expect(result.current.workspaceLoading).toBe(false))
    expect(result.current.selectedRecord?.id).toBeDefined()

    act(() => {
      result.current.handleSelectRecord('lead-citrix-research')
    })

    act(() => {
      result.current.setSelectedStage('Handoff ready')
    })

    act(() => {
      result.current.handleApplyStageChange()
    })

    expect(result.current.toastMessage).toMatch(/Handoff ready requires owner/)

    act(() => {
      result.current.handleRecordFieldChange('owner', 'Jordan Ellis')
      result.current.handleRecordFieldChange('buyerPersona', 'Infrastructure Director')
      result.current.handleRecordFieldChange('nextTouchDueAt', '2026-03-30T14:00')
    })

    act(() => {
      result.current.setSelectedStage('Handoff ready')
    })

    act(() => {
      result.current.handleApplyStageChange()
    })

    await waitFor(() => expect(result.current.selectedRecord?.stage).toBe('Handoff ready'))
  })

  it('resets filters, queue view, and toast state', async () => {
    const { result } = renderHook(() => useDeskState())
    await waitFor(() => expect(result.current.workspaceLoading).toBe(false))
    expect(result.current.selectedRecord?.id).toBeDefined()

    act(() => {
      result.current.setSearchTerm('citrix')
      result.current.setSelectedViewId('stale')
    })

    await act(async () => {
      await result.current.handleReset()
    })

    expect(result.current.searchTerm).toBe('')
    expect(result.current.selectedViewId).toBe(result.current.queueViews[0].id)
    expect(result.current.toastMessage).toBe('Demo data reset. HostDesk sales-ops scenarios are back to baseline.')

    act(() => {
      vi.advanceTimersByTime(3800)
    })

    expect(result.current.toastMessage).toBeNull()
  })
})
