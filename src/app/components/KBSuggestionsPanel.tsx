import { BookOpenCheck } from 'lucide-react'
import type { KBArticle } from '../../types'

type Props = {
  kbSuggestions: KBArticle[]
  handleShareKB: (article: KBArticle) => void
}

const KBSuggestionsPanel = ({ kbSuggestions, handleShareKB }: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <BookOpenCheck size={18} />
      <h3>KB suggestions</h3>
    </div>
    <div className="panel-body kb-suggestions">
      <p className="muted">Share directly from the composer above or with the buttons here.</p>
      {kbSuggestions.length ? (
        kbSuggestions.map((article) => (
          <div key={article.id} className="kb-article">
            <div>
              <strong>{article.title}</strong>
              <p>{article.summary}</p>
              <small>{article.keywords.join(', ')}</small>
            </div>
            <button type="button" onClick={() => handleShareKB(article)}>
              Share KB
            </button>
          </div>
        ))
      ) : (
        <p className="muted">No keyword matches yet. Keep adding details to the thread.</p>
      )}
    </div>
  </div>
)

export default KBSuggestionsPanel
