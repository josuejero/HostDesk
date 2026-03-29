import { MessageCircle } from 'lucide-react'
import type { ActivityType, OutreachTemplate, OutreachTemplateCategory, PlaybookArticle } from '../../types'

type Props = {
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

const activityTypeOptions: Array<{ value: ActivityType; label: string }> = [
  { value: 'outbound-email', label: 'Outbound email' },
  { value: 'call-attempt', label: 'Call attempt' },
  { value: 'linkedin-touch', label: 'LinkedIn touch' },
  { value: 'reply-received', label: 'Reply received' },
  { value: 'meeting-booked', label: 'Meeting booked' },
  { value: 'enrichment-update', label: 'Enrichment update' },
  { value: 'note-added', label: 'Note added' },
]

const ComposerPanel = ({
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
}: Props) => (
  <div className="panel composer-panel">
    <div className="panel-heading">
      <MessageCircle size={18} />
      <h3>Outreach and activity composer</h3>
    </div>
    <div className="panel-body composer-body">
      <label className="utility-field">
        <span>Outreach templates</span>
        <select
          value={selectedReplyId ?? ''}
          onChange={(event) => {
            const value = event.target.value
            if (value) {
              handleUseCannedReply(value)
              return
            }
            setSelectedReplyId(null)
          }}
        >
          <option value="">Start from scratch</option>
          {cannedCategoryOrder.map((category) => (
            <optgroup key={category} label={cannedCategoryLabels[category]}>
              {cannedRepliesByCategory[category].map((reply) => (
                <option key={reply.id} value={reply.id}>
                  {reply.title} ({reply.tone})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {selectedCannedReply && (
        <div className="canned-preview">
          <div>
            <strong>Opener</strong>
            <p>{selectedCannedReply.segments.opener}</p>
          </div>
          <div>
            <strong>Value prop</strong>
            <p>{selectedCannedReply.segments.valueProp}</p>
          </div>
          <div>
            <strong>Next step</strong>
            <p>{selectedCannedReply.segments.nextStep}</p>
          </div>
        </div>
      )}
      <label className="utility-field">
        <span>Activity type</span>
        <select value={draftActivityType} onChange={(event) => setDraftActivityType(event.target.value as ActivityType)}>
          {activityTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="utility-field">
        <span>Outcome</span>
        <input value={draftOutcome} onChange={(event) => setDraftOutcome(event.target.value)} placeholder="Delivered, Interested, Voicemail..." />
      </label>
      <label className="utility-field">
        <span>Log activity</span>
        <textarea value={draftReply} onChange={(event) => setDraftReply(event.target.value)} rows={4} />
      </label>
      <label className="utility-field">
        <span>Next step</span>
        <input value={draftNextStep} onChange={(event) => setDraftNextStep(event.target.value)} placeholder="Schedule discovery, send comparison, confirm budget..." />
      </label>
      <label className="utility-field">
        <span>Next touch due</span>
        <input type="datetime-local" value={draftNextTouchDueAt} onChange={(event) => setDraftNextTouchDueAt(event.target.value)} />
      </label>
      <label className="utility-field checkbox-field">
        <span>CRM fields updated</span>
        <input type="checkbox" checked={draftCrmUpdated} onChange={(event) => setDraftCrmUpdated(event.target.checked)} />
      </label>
      {requiresCannedEdit && (
        <p className="muted composer-reminder">
          Edit the template so the touch reflects the actual company, workload, and next step.
        </p>
      )}
      <div className="composer-controls">
        <div className="kb-share-row">
          <select
            value={selectedArticleId ?? ''}
            onChange={(event) => setSelectedArticleId(event.target.value || null)}
            disabled={!playbookSuggestions.length}
          >
            {playbookSuggestions.length ? (
              playbookSuggestions.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))
            ) : (
              <option value="">No playbooks yet</option>
            )}
          </select>
          <button
            type="button"
            className="ghost-btn"
            onClick={handleShareSelectedArticle}
            disabled={!selectedArticleId}
          >
            Save playbook note
          </button>
        </div>
        <button
          type="button"
          className="primary"
          onClick={handleLogActivity}
          disabled={!draftReply.trim() || requiresCannedEdit}
        >
          Log activity
        </button>
      </div>
    </div>
  </div>
)

export default ComposerPanel
