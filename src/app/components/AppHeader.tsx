import type { Dispatch, SetStateAction } from 'react'
import type { ScenarioSeed } from '../../types'

type Props = {
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  jumpTargetId: string
  scenarioCatalog: ScenarioSeed[]
  onSelectTicket: (ticketId: string) => void
  onReset: () => void
  onToggleScenarioLibrary: () => void
  onToggleWalkthrough: () => void
}

const AppHeader = ({
  searchTerm,
  setSearchTerm,
  jumpTargetId,
  scenarioCatalog,
  onSelectTicket,
  onReset,
  onToggleScenarioLibrary,
  onToggleWalkthrough,
}: Props) => (
  <header className="app-header">
    <div className="brand-copy">
      <p className="eyebrow">HostDesk • hosting + support desk simulator</p>
      <h1>
        Queue operations
        <span>Work like a Zendesk queue built for recruiters.</span>
      </h1>
      <p className="hero-blurb">
        A recruiter-facing console that highlights statuses, departments, tags, and SLA visibility at a glance.
      </p>
    </div>
    <div className="utility-row">
      <label className="utility-field">
        <span>Search the queue</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Subject, department, tag, or assignee"
        />
      </label>
      <label className="utility-field">
        <span>Jump to demo case</span>
        <select value={jumpTargetId} onChange={(event) => onSelectTicket(event.target.value)}>
          {scenarioCatalog.map((scenario) => (
            <option key={scenario.ticket.id} value={scenario.ticket.id}>
              {scenario.title} ({scenario.bucket})
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="ghost-btn" onClick={onReset}>
        Reset demo
      </button>
      <button type="button" className="ghost-btn" onClick={onToggleScenarioLibrary}>
        Browse library
      </button>
      <button type="button" className="ghost-btn" onClick={onToggleWalkthrough}>
        Recruiter walkthrough
      </button>
    </div>
  </header>
)

export default AppHeader
