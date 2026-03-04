import type { KeyboardEvent } from 'react'
import type { ScenarioSeed, Ticket } from '../../types'

type Props = {
  scenario: ScenarioSeed
  ticket?: Ticket
  onClose: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

const WalkthroughOverlay = ({ scenario, ticket, onClose, onKeyDown }: Props) => (
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
          Check SLA timer: {ticket?.slaTargetMinutes ?? 0} minutes from{' '}
          {new Date(ticket?.createdAt || 0).toLocaleTimeString()}.
        </li>
        <li>Refer to KB suggestions and canned replies before replying; keep tone human.</li>
        <li>Notice how scorecard ties to SLA, empathy, and KB usage.</li>
        <li>Postmortem fields ensure closure discipline (root cause, fix, follow-up, prevention).</li>
      </ul>
      <button type="button" onClick={onClose}>
        Finish walkthrough
      </button>
    </div>
  </div>
)

export default WalkthroughOverlay
