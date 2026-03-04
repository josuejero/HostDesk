import type { KnowledgeArticleStatus, PostmortemSection } from '../../types'

export const postmortemNarrativeFields = ['rootCause', 'fix', 'followUp', 'prevention'] as const

export const postmortemFieldLabels: Record<typeof postmortemNarrativeFields[number], string> = {
  rootCause: 'Root cause documented',
  fix: 'Fix applied',
  followUp: 'Follow-up message sent',
  prevention: 'Prevention action captured',
}

export const isPostmortemNarrativeComplete = (postmortem: PostmortemSection) =>
  postmortemNarrativeFields.every((field) => postmortem[field].trim().length > 0)

export const hasKnowledgeArticleAnswer = (status: KnowledgeArticleStatus) => status.trim().length > 0

export const isPostmortemComplete = (postmortem: PostmortemSection) =>
  isPostmortemNarrativeComplete(postmortem) && hasKnowledgeArticleAnswer(postmortem.knowledgeArticleStatus)
