import type { CRMHygieneReview, PlaybookStatus } from '../../types'

export const reviewNarrativeFields = ['deduplication', 'stageCriteria', 'nextStepPlan', 'handoffNotes'] as const

export const reviewFieldLabels: Record<typeof reviewNarrativeFields[number], string> = {
  deduplication: 'Deduplication check',
  stageCriteria: 'Stage criteria',
  nextStepPlan: 'Next-step plan',
  handoffNotes: 'Handoff notes',
}

export const isReviewNarrativeComplete = (review: CRMHygieneReview) =>
  reviewNarrativeFields.every((field) => review[field].trim().length > 0)

export const hasPlaybookStatus = (status: PlaybookStatus) => status.trim().length > 0

export const isReviewComplete = (review: CRMHygieneReview) =>
  isReviewNarrativeComplete(review) && hasPlaybookStatus(review.playbookStatus)
