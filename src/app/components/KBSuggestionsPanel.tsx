import { BookOpenCheck } from 'lucide-react'
import type { PlaybookArticle } from '../../types'

type Props = {
  playbookSuggestions: PlaybookArticle[]
  handleSharePlaybook: (article: PlaybookArticle) => void
}

const KBSuggestionsPanel = ({ playbookSuggestions, handleSharePlaybook }: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <BookOpenCheck size={18} />
      <h3>Playbook suggestions</h3>
    </div>
    <div className="panel-body kb-suggestions">
      <p className="muted">Matched playbooks surface from workload, pain-point, and activity keywords.</p>
      {playbookSuggestions.length ? (
        playbookSuggestions.map((article) => (
          <div key={article.id} className="kb-article">
            <div>
              <strong>{article.title}</strong>
              <p>{article.summary}</p>
              <small>
                {article.focusArea} · {article.keywords.join(', ')}
              </small>
            </div>
            <button type="button" onClick={() => handleSharePlaybook(article)}>
              Save note
            </button>
          </div>
        ))
      ) : (
        <p className="muted">No playbooks matched yet. Tighten the subject, use case, or activity notes.</p>
      )}
    </div>
  </div>
)

export default KBSuggestionsPanel
