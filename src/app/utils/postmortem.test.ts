import { hasPlaybookStatus, isReviewComplete, isReviewNarrativeComplete } from './postmortem'

describe('crm hygiene review utilities', () => {
  it('knows when every narrative field is filled', () => {
    const filled = {
      deduplication: 'Checked duplicates',
      stageCriteria: 'Qualified',
      nextStepPlan: 'Follow up tomorrow',
      handoffNotes: 'Not ready yet',
      playbookStatus: 'updated',
    } as const

    expect(isReviewNarrativeComplete(filled)).toBe(true)
    expect(isReviewComplete(filled)).toBe(true)
  })

  it('detects missing narrative details and playbook answers', () => {
    const partial = {
      deduplication: 'Checked duplicates',
      stageCriteria: '',
      nextStepPlan: '',
      handoffNotes: 'Pending',
      playbookStatus: '',
    } as const

    expect(isReviewNarrativeComplete(partial)).toBe(false)
    expect(isReviewComplete(partial)).toBe(false)
    expect(hasPlaybookStatus(partial.playbookStatus)).toBe(false)
  })
})
