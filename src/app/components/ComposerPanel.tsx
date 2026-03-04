import type { Audience, CannedReply, CannedReplyCategory, KBArticle } from '../../types'
import { MessageCircle } from 'lucide-react'

type Props = {
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
  kbSuggestions: KBArticle[]
  selectedArticleId: string | null
  setSelectedArticleId: (value: string | null) => void
  handleShareSelectedArticle: () => void
  setSelectedReplyId: (value: string | null) => void
}

const ComposerPanel = ({
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
  kbSuggestions,
  selectedArticleId,
  setSelectedArticleId,
  handleShareSelectedArticle,
  setSelectedReplyId,
}: Props) => (
  <div className="panel composer-panel">
    <div className="panel-heading">
      <MessageCircle size={18} />
      <h3>Reply composer</h3>
    </div>
    <div className="panel-body composer-body">
      <label className="utility-field">
        <span>Canned replies</span>
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
            <strong>Acknowledgment</strong>
            <p>{selectedCannedReply.segments.acknowledgment}</p>
          </div>
          <div>
            <strong>Ownership</strong>
            <p>{selectedCannedReply.segments.ownership}</p>
          </div>
          <div>
            <strong>Next step</strong>
            <p>{selectedCannedReply.segments.nextStep}</p>
          </div>
        </div>
      )}
      <label className="utility-field">
        <span>Audience</span>
        <select value={draftAudience} onChange={(event) => setDraftAudience(event.target.value as Audience)}>
          <option value="customer">Customer-facing</option>
          <option value="internal">Internal note</option>
        </select>
      </label>
      <label className="utility-field">
        <span>Compose reply</span>
        <textarea value={draftReply} onChange={(event) => setDraftReply(event.target.value)} rows={4} />
      </label>
      {requiresCannedEdit && (
        <p className="muted composer-reminder">
          Edit the canned response so it feels personalized, empathetic, and clear about next steps.
        </p>
      )}
      <div className="composer-controls">
        <div className="kb-share-row">
          <select
            value={selectedArticleId ?? ''}
            onChange={(event) => setSelectedArticleId(event.target.value || null)}
            disabled={!kbSuggestions.length}
          >
            {kbSuggestions.length ? (
              kbSuggestions.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))
            ) : (
              <option value="">No articles yet</option>
            )}
          </select>
          <button
            type="button"
            className="ghost-btn"
            onClick={handleShareSelectedArticle}
            disabled={!selectedArticleId}
          >
            Share article
          </button>
        </div>
        <button
          type="button"
          className="primary"
          onClick={handleSendReply}
          disabled={!draftReply.trim() || requiresCannedEdit}
        >
          Send reply
        </button>
      </div>
    </div>
  </div>
)

export default ComposerPanel
