import type { MetricsRange, MetricsSnapshot } from '../../../types'

type Props = {
  metrics: MetricsSnapshot | null
  range: MetricsRange
  onRangeChange: (range: MetricsRange) => void
  onRefresh: () => void
  isLoading: boolean
  error: string | null
}

const percent = (value: number) => `${value.toFixed(1)}%`

const MetricsDashboard = ({ metrics, range, onRangeChange, onRefresh, isLoading, error }: Props) => (
  <section className="metrics-shell">
    <div className="metrics-header">
      <div>
        <p className="eyebrow">Pipeline metrics</p>
        <h2>Operational health from persisted activity and stage data</h2>
        <p className="hero-blurb">
          These totals now come from MySQL queries instead of browser-only state, so the dashboard reflects saved work across sessions.
        </p>
      </div>
      <div className="metrics-controls">
        <label className="utility-field">
          <span>Range</span>
          <select value={range} onChange={(event) => onRangeChange(event.target.value as MetricsRange)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
        <button type="button" className="ghost-btn" onClick={onRefresh} disabled={isLoading}>
          Refresh metrics
        </button>
      </div>
    </div>

    {error && <p className="metrics-error">{error}</p>}

    <div className="metrics-grid">
      <article className="metric-card">
        <span>Response rate</span>
        <strong>{metrics ? percent(metrics.responseRatePct) : '--'}</strong>
      </article>
      <article className="metric-card">
        <span>Overdue follow-ups</span>
        <strong>{metrics?.overdueFollowups ?? '--'}</strong>
      </article>
      <article className="metric-card">
        <span>Tasks due today</span>
        <strong>{metrics?.tasksDueToday ?? '--'}</strong>
      </article>
      <article className="metric-card">
        <span>Meetings booked</span>
        <strong>{metrics?.meetingsBooked ?? '--'}</strong>
      </article>
    </div>

    <div className="metrics-content">
      <div className="panel">
        <div className="panel-heading">
          <h3>Stage conversion snapshot</h3>
        </div>
        <div className="panel-body">
          {metrics?.stageConversions.length ? (
            <div className="metrics-list">
              {metrics.stageConversions.map((item) => (
                <div key={`${item.fromStage ?? 'none'}-${item.toStage}`} className="metrics-row">
                  <div>
                    <strong>{item.fromStage ?? 'New entry'} → {item.toStage}</strong>
                    <p>{item.convertedProspects} converted prospects</p>
                  </div>
                  <span>{item.conversionPct !== null ? percent(item.conversionPct) : 'n/a'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No stage conversion history has been captured yet.</p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h3>Overdue follow-up queue</h3>
        </div>
        <div className="panel-body">
          {metrics?.overdueItems.length ? (
            <div className="metrics-list">
              {metrics.overdueItems.map((item) => (
                <div key={`${item.company}-${item.dueAt}`} className="metrics-row">
                  <div>
                    <strong>{item.company}</strong>
                    <p>{item.owner} • {item.stepName}</p>
                  </div>
                  <span>{new Date(item.dueAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No overdue open tasks right now.</p>
          )}
        </div>
      </div>
    </div>
  </section>
)

export default MetricsDashboard
