import { act, renderHook } from '@testing-library/react'
import { useDeskState } from './useDeskState'

describe('useDeskState hook interactions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('selects a ticket and hides the scenario library', () => {
    const { result } = renderHook(() => useDeskState())
    const secondTicketId = result.current.scenarioCatalog[1].ticket.id

    act(() => {
      result.current.handleToggleScenarioLibrary()
      result.current.handleSelectTicket(secondTicketId)
    })

    expect(result.current.selectedTicket?.id).toBe(secondTicketId)
    expect(result.current.showScenarioLibrary).toBe(false)
  })

  it('requires canned replies to be personalized before sending', () => {
    const { result } = renderHook(() => useDeskState())
    const firstCategory = result.current.cannedCategoryOrder[0]
    const cannedReply = result.current.cannedRepliesByCategory[firstCategory][0]
    const initialThreadLength = result.current.selectedTicket?.thread.length ?? 0

    act(() => {
      result.current.handleUseCannedReply(cannedReply.id)
    })

    expect(result.current.requiresCannedEdit).toBe(true)

    act(() => {
      result.current.handleSendReply()
    })

    expect(result.current.toastMessage).toMatch(/Please personalize/)
    expect(result.current.selectedTicket?.thread.length).toBe(initialThreadLength)

    act(() => {
      result.current.setDraftReply('Customized text')
    })

    expect(result.current.requiresCannedEdit).toBe(false)

    act(() => {
      result.current.handleSendReply()
    })

    expect(result.current.selectedTicket?.thread.length).toBe(initialThreadLength + 1)
    expect(result.current.draftReply).toBe('')
    expect(result.current.selectedReplyId).toBeNull()
  })

  it('shares KB articles and records the match with a toast', () => {
    const { result } = renderHook(() => useDeskState())
    if (!result.current.kbSuggestions.length) {
      throw new Error('Expected KB suggestions for the default ticket')
    }
    const articleId = result.current.kbSuggestions[0].id
    const threadLength = result.current.selectedTicket?.thread.length ?? 0

    act(() => {
      result.current.setSelectedArticleId(articleId)
      result.current.handleShareSelectedArticle()
    })

    expect(result.current.selectedTicket?.kbMatches).toContain(articleId)
    expect(result.current.selectedTicket?.thread.length).toBe(threadLength + 1)
    expect(result.current.toastMessage).toContain('Shared KB article')
  })

  it('blocks solved status until the postmortem checklist is complete', () => {
    const { result } = renderHook(() => useDeskState())
    const initialStatus = result.current.selectedTicket?.status

    act(() => {
      result.current.handleStatusAction('solved')
    })

    expect(result.current.toastMessage).toMatch(/Finish the postmortem/)
    expect(result.current.selectedTicket?.status).toBe(initialStatus)

    act(() => {
      result.current.postmortemNarrativeFields.forEach((field) => {
        result.current.handlePostmortemChange(field, 'Documented info')
      })
      result.current.handlePostmortemChange('knowledgeArticleStatus', 'yes')
    })

    expect(result.current.caseCloseReady).toBe(true)

    act(() => {
      result.current.handleStatusAction('solved')
    })

    expect(result.current.selectedTicket?.status).toBe('Solved')
    expect(result.current.toastMessage).toBe('Solved action queued.')
  })

  it('resets filters, queue view, and toast state', () => {
    const { result } = renderHook(() => useDeskState())

    act(() => {
      result.current.setSearchTerm('invoice')
      result.current.setSelectedViewId('resolved')
      result.current.handleReset()
    })

    expect(result.current.searchTerm).toBe('')
    expect(result.current.selectedViewId).toBe(result.current.queueViews[0].id)
    expect(result.current.toastMessage).toBe('Demo data reset. Welcome back to square one!')

    act(() => {
      vi.advanceTimersByTime(3800)
    })

    expect(result.current.toastMessage).toBeNull()
  })
})
