import clsx from 'clsx'
import type { ViewDefinition } from '../constants/queueViews'

type Props = {
  views: ViewDefinition[]
  activeViewId: string
  viewCounts: Record<string, number>
  matchingCount: number
  onSelectView: (viewId: string) => void
}

const QueueNav = ({ views, activeViewId, viewCounts, matchingCount, onSelectView }: Props) => (
  <nav className="views-nav">
    <div className="views-heading">
      <p className="eyebrow">Views</p>
      <p className="hero-blurb">Follow-up cadence, hygiene risk, meetings, and handoff readiness modeled as queue slices.</p>
    </div>
    <ul className="views-list">
      {views.map((view) => (
        <li key={view.id}>
          <button
            type="button"
            className={clsx('view-link', { active: activeViewId === view.id })}
            onClick={() => onSelectView(view.id)}
            aria-pressed={activeViewId === view.id}
          >
            <div>
              <strong>{view.label}</strong>
              <small>{view.description}</small>
            </div>
            <span className="count">{viewCounts[view.id] ?? 0}</span>
          </button>
        </li>
      ))}
    </ul>
    <p className="view-footnote">{matchingCount} records matching filters</p>
  </nav>
)

export default QueueNav
