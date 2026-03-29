import { Sparkles } from 'lucide-react'
import type { AiSuggestion, AiSuggestionKind } from '../../types'

type Props = {
  aiSuggestion: AiSuggestion | null
  onGenerate: (kind: AiSuggestionKind) => void
  onApply: () => void
}

const AIAssistPanel = ({ aiSuggestion, onGenerate, onApply }: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <Sparkles size={18} />
      <h3>AI Assist</h3>
    </div>
    <div className="panel-body">
      <p className="muted">Mock mode only: deterministic suggestions generated from the record, timeline, and matched playbooks.</p>
      <div className="status-actions">
        <button type="button" className="ghost-btn" onClick={() => onGenerate('summary')}>
          Summarize account
        </button>
        <button type="button" className="ghost-btn" onClick={() => onGenerate('next-step')}>
          Recommend next step
        </button>
        <button type="button" className="ghost-btn" onClick={() => onGenerate('draft')}>
          Draft follow-up
        </button>
      </div>
      {aiSuggestion && (
        <div className="guided-card">
          <div className="guided-card__header">
            <strong>{aiSuggestion.headline}</strong>
            <small className="muted">Suggestion only - review before applying.</small>
          </div>
          <p>{aiSuggestion.body}</p>
          <button type="button" className="ghost-btn" onClick={onApply} disabled={aiSuggestion.applied}>
            {aiSuggestion.applied ? 'Applied' : 'Apply suggestion'}
          </button>
        </div>
      )}
    </div>
  </div>
)

export default AIAssistPanel
