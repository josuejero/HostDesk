import { Layers } from 'lucide-react'
import type { PlaybookArticle } from '../../types'
import type { GuidedEntry } from '../constants/subjectTriggers'

type Props = {
  guidedResearch: GuidedEntry[]
  handleSharePlaybook: (article: PlaybookArticle) => void
}

const GuidedTroubleshootingPanel = ({ guidedResearch, handleSharePlaybook }: Props) => (
  <div className="panel panel--guided">
    <div className="panel-heading">
      <Layers size={18} />
      <h3>Guided account research</h3>
    </div>
    <div className="panel-body guided-body">
      <p className="muted">
        Subject-triggered research hints keep the motion tied to how the prospect describes the problem.
      </p>
      {guidedResearch.length ? (
        guidedResearch.map((group) => (
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
                  <button type="button" className="ghost-btn" onClick={() => handleSharePlaybook(article)}>
                    Save
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="muted">
          No guided research path triggered yet. Mention Citrix, AVD, Cloud PC, BYOD, Intune, compliance, or MSP language to unlock one.
        </p>
      )}
    </div>
  </div>
)

export default GuidedTroubleshootingPanel
