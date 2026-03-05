import { basePostmortem } from '../../tests/fixtures'
import { hasKnowledgeArticleAnswer, isPostmortemComplete, isPostmortemNarrativeComplete } from './postmortem'

describe('postmortem utilities', () => {
  it('knows when every narrative field is filled', () => {
    const filled = {
      ...basePostmortem,
      rootCause: 'Root cause',
      fix: 'Fixed',
      followUp: 'Followed up',
      prevention: 'Prevented',
      knowledgeArticleStatus: 'yes',
    }

    expect(isPostmortemNarrativeComplete(filled)).toBe(true)
    expect(isPostmortemComplete(filled)).toBe(true)
  })

  it('detects missing narrative details and knowledge answers', () => {
    const partial = {
      ...basePostmortem,
      rootCause: 'Root cause',
      fix: '',
      followUp: '',
      prevention: '',
      knowledgeArticleStatus: '',
    }

    expect(isPostmortemNarrativeComplete(partial)).toBe(false)
    expect(isPostmortemComplete(partial)).toBe(false)
    expect(hasKnowledgeArticleAnswer(partial.knowledgeArticleStatus)).toBe(false)
  })
})
