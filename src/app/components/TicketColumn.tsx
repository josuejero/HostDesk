import clsx from 'clsx'
import { AlertTriangle, Clock, Flag, ShieldAlert, Zap } from 'lucide-react'
import type { ProspectRecord, ScenarioSeed } from '../../types'
import { getCountdownLabel, getTimerStatus, timerStatusDescriptions } from '../utils/timer'
import { getMicrosoftMotion } from '../utils/routing'

type Props = {
  activeView: { label: string; description: string } | null
  filteredRecords: ProspectRecord[]
  scenarioMap: Map<string, ScenarioSeed>
  selectedRecordId?: string
  onSelectRecord: (recordId: string) => void
}

const TicketColumn = ({ activeView, filteredRecords, scenarioMap, selectedRecordId, onSelectRecord }: Props) => (
  <section className="tickets-column">
    <div className="tickets-header">
      <div>
        <p className="eyebrow">{activeView?.label ?? 'Queue'}</p>
        <h2>{activeView?.description}</h2>
      </div>
      <p className="hero-blurb ticket-count-cta">
        {filteredRecords.length
          ? `Showing ${filteredRecords.length} record${filteredRecords.length > 1 ? 's' : ''}`
          : 'No records match this view and search yet.'}
      </p>
    </div>
    <ul className="ticket-list">
      {filteredRecords.length ? (
        filteredRecords.map((record) => {
          const scenario = scenarioMap.get(record.id)
          const isActive = selectedRecordId === record.id
          const countdownLabel = getCountdownLabel(record)
          const cardTimerStatus = getTimerStatus(record)
          const timerAssistive = timerStatusDescriptions[cardTimerStatus]
          const motion = getMicrosoftMotion(record, scenario)
          return (
            <li key={record.id}>
              <button
                type="button"
                className={clsx('ticket-card', { active: isActive })}
                onClick={() => onSelectRecord(record.id)}
                aria-pressed={isActive}
                aria-label={`Open account "${record.company}", currently ${record.stage}`}
              >
                <div className="ticket-card-top">
                  <div>
                    <h3>{record.company}</h3>
                    <p className="ticket-card-subtext">
                      {record.subject}
                    </p>
                  </div>
                  <div
                    className={clsx('ticket-card-timer', `timer-${cardTimerStatus}`)}
                    role="status"
                    aria-live="polite"
                    aria-label={`${timerAssistive}. ${countdownLabel}`}
                  >
                    <Clock size={16} aria-hidden="true" />
                    <span>{countdownLabel}</span>
                  </div>
                </div>
                <div className="ticket-card-meta">
                  <span className="badge department" aria-label={`Segment: ${record.segment}`}>
                    <Flag size={12} aria-hidden="true" />
                    <span>{record.segment}</span>
                  </span>
                  <span
                    className={clsx('badge status', record.stage.toLowerCase().replace(/\s+/g, '-'))}
                    aria-label={`Stage: ${record.stage}`}
                  >
                    <ShieldAlert size={12} aria-hidden="true" />
                    <span>{record.stage}</span>
                  </span>
                  <span className="badge priority" aria-label={`Motion: ${motion}`}>
                    <Zap size={12} aria-hidden="true" />
                    <span>{motion}</span>
                  </span>
                  <span className="badge severity" aria-label={`Owner: ${record.owner || 'Unassigned'}`}>
                    <AlertTriangle size={12} aria-hidden="true" />
                    <span>{record.owner || 'Unassigned'}</span>
                  </span>
                </div>
                <div className="tag-row compact">
                  {(scenario?.tags ?? []).map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            </li>
          )
        })
      ) : (
        <li className="empty-state" role="status" aria-live="polite">
          <p>No records match this view and search yet.</p>
          <p>Try clearing the search, picking a different queue slice, or using the reset control above.</p>
        </li>
      )}
    </ul>
  </section>
)

export default TicketColumn
