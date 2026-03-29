import type { KeyboardEvent } from 'react'
import type { ProspectRecord, ScenarioSeed } from '../../types'

type Props = {
  scenario: ScenarioSeed
  record?: ProspectRecord
  onClose: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

const WalkthroughOverlay = ({ scenario, record, onClose, onKeyDown }: Props) => (
  <div
    className="walkthrough-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="walkthrough-title"
    onKeyDown={onKeyDown}
  >
    <div className="walkthrough-card" tabIndex={-1}>
      <h3 id="walkthrough-title">Recruiter walkthrough</h3>
      <p>{scenario.description}</p>
      <ul>
        <li>
          Start in the queue and check whether the dated next step is healthy, due today, or stale.
        </li>
        <li>Use the playbook suggestions and outreach templates before logging a touch; keep the motion specific.</li>
        <li>Notice how the scorecard tracks CRM completeness, hygiene, ICP fit, and follow-up discipline.</li>
        <li>
          Try changing the record stage or fixing missing owner/next-step fields to see queue slices update live.
        </li>
        <li>
          AI Assist is suggestion-only: apply a summary, next-best action, or draft only after reviewing it.
        </li>
      </ul>
      {record && (
        <p className="muted">
          Current focus: {record.company} • {record.stage} • next touch{' '}
          {record.nextTouchDueAt ? new Date(record.nextTouchDueAt).toLocaleString() : 'missing'}
        </p>
      )}
      <button type="button" onClick={onClose}>
        Finish walkthrough
      </button>
    </div>
  </div>
)

export default WalkthroughOverlay
