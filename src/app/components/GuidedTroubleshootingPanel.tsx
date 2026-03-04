import { Layers } from 'lucide-react'
import type { GuidedEntry } from '../constants/subjectTriggers'
import type { KBArticle } from '../../types'

type Props = {
  guidedTroubleshooting: GuidedEntry[]
  handleShareKB: (article: KBArticle) => void
}

const GuidedTroubleshootingPanel = ({ guidedTroubleshooting, handleShareKB }: Props) => (
  <div className="panel panel--guided">
    <div className="panel-heading">
      <Layers size={18} />
      <h3>Guided troubleshooting</h3>
    </div>
    <div className="panel-body guided-body">
      <p className="muted">
        Atlassian-style subject-triggered suggestions pair keywords with KB articles and tips.
      </p>
      {guidedTroubleshooting.length ? (
        guidedTroubleshooting.map((group) => (
          <div key={group.id} className="guided-card">
            <div className="guided-card__header">
              <strong>{group.headline}</strong>
              <small className="muted">{group.description}</small>
              <small className="guided-keywords">Keywords: {group.keywords.join(', ')}</small>
            </div>
            <ul className="guided-tips">
              {group.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <div className="guided-articles">
              {group.articles.slice(0, 2).map((article) => (
                <div key={article.id} className="guided-article">
                  <div>
                    <strong>{article.title}</strong>
                    <p>{article.summary}</p>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => handleShareKB(article)}>
                    Share
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="muted">
          No guided path triggered yet — mention plugin, paid/invoice, or lag/high ping in the subject to unlock them.
        </p>
      )}
    </div>
  </div>
)

export default GuidedTroubleshootingPanel
