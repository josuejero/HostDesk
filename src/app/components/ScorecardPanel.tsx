import { BookOpenCheck } from 'lucide-react'
import type { Scorecard, ScoringRubric } from '../../types'

type Props = {
  scorecard: Scorecard
  rubric: ScoringRubric
}

const ScorecardPanel = ({ scorecard, rubric }: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <BookOpenCheck size={18} />
      <h3>Scorecard ({rubric.focus})</h3>
    </div>
    <div className="panel-body scorecard">
      {scorecard.metrics.map((metric) => {
        const rubricMetric = rubric.metrics.find((item) => item.id === metric.id)
        return (
          <div key={metric.id} className="score-metric">
            <div>
              <strong>{metric.label}</strong>
              <span>
                {metric.value}/{metric.max}
              </span>
            </div>
            <p className="note">{metric.note}</p>
            {rubricMetric && <p className="suggestion">{rubricMetric.suggestion}</p>}
            <div className="meter">
              <div style={{ width: `${(metric.value / metric.max) * 100}%` }} />
            </div>
          </div>
        )
      })}
      <div className="total">Total {scorecard.total}/100</div>
    </div>
  </div>
)

export default ScorecardPanel
