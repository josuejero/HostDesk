import { ShieldAlert } from 'lucide-react'
import type { Scorecard } from '../../types'

type Props = {
  scorecard: Scorecard
  maxTotal: number
}

const DeEscalationPanel = ({ scorecard, maxTotal }: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <ShieldAlert size={18} />
      <h3>Execution quality</h3>
    </div>
    <div className="panel-body scorecard">
      {scorecard.metrics.map((metric) => (
        <div key={metric.id} className="score-metric">
          <div>
            <strong>{metric.label}</strong>
            <span>
              {metric.value}/{metric.max}
            </span>
          </div>
          <p className="note">{metric.note}</p>
          <div className="meter">
            <div style={{ width: `${(metric.value / metric.max) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="total">
        Total {scorecard.total}/{maxTotal}
      </div>
    </div>
  </div>
)

export default DeEscalationPanel
