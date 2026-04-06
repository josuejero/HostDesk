import type { Dispatch, SetStateAction } from 'react'
import type { ScenarioSeed } from '../../types'

type Surface = 'workspace' | 'metrics'

type Props = {
  activeSurface: Surface
  onSetActiveSurface: (surface: Surface) => void
  currentUserName: string
  onLogout: () => void
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  jumpTargetId: string
  scenarioCatalog: ScenarioSeed[]
  onSelectRecord: (recordId: string) => void
  onReset: () => void
  onToggleScenarioLibrary: () => void
  onToggleWalkthrough: () => void
}

const AppHeader = ({
  activeSurface,
  onSetActiveSurface,
  currentUserName,
  onLogout,
  searchTerm,
  setSearchTerm,
  jumpTargetId,
  scenarioCatalog,
  onSelectRecord,
  onReset,
  onToggleScenarioLibrary,
  onToggleWalkthrough,
}: Props) => (
  <header className="app-header">
    <div className="brand-copy">
      <p className="eyebrow">HostDesk • Microsoft cloud sales-ops console</p>
      <h1>
        Queue operations
        <span>Pipeline discipline for AVD, Windows 365, and Intune motions.</span>
      </h1>
      <p className="hero-blurb">
        A recruiter-facing console for researching, qualifying, routing, and following up with Microsoft cloud prospects.
      </p>
    </div>
    <div className="utility-row">
      <div className="header-switcher" role="tablist" aria-label="HostDesk workspace panels">
        <button
          type="button"
          className={activeSurface === 'workspace' ? 'primary' : 'ghost-btn'}
          onClick={() => onSetActiveSurface('workspace')}
          aria-pressed={activeSurface === 'workspace'}
        >
          Workspace
        </button>
        <button
          type="button"
          className={activeSurface === 'metrics' ? 'primary' : 'ghost-btn'}
          onClick={() => onSetActiveSurface('metrics')}
          aria-pressed={activeSurface === 'metrics'}
        >
          Metrics
        </button>
      </div>
      {activeSurface === 'workspace' && (
        <>
          <label className="utility-field">
            <span>Search the queue</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Company, workload, stage, tag, or owner"
            />
          </label>
          <label className="utility-field">
            <span>Jump to demo case</span>
            <select value={jumpTargetId} onChange={(event) => onSelectRecord(event.target.value)}>
              {scenarioCatalog.map((scenario) => (
                <option key={scenario.record.id} value={scenario.record.id}>
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
        </>
      )}
      <div className="session-chip" aria-label={`Signed in as ${currentUserName}`}>
        <span>Signed in</span>
        <strong>{currentUserName}</strong>
      </div>
      <button type="button" className="ghost-btn" onClick={onLogout}>
        Logout
      </button>
    </div>
  </header>
)

export default AppHeader
