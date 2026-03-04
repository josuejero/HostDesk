import clsx from 'clsx'
import { AlertTriangle, Clock, Flag, ShieldAlert, Zap } from 'lucide-react'
import type { ScenarioSeed, Ticket } from '../../types'
import { getCountdownLabel, getTimerStatus, timerStatusDescriptions } from '../utils/timer'

type Props = {
  activeView: { label: string; description: string } | null
  filteredTickets: Ticket[]
  scenarioMap: Map<string, ScenarioSeed>
  selectedTicketId?: string
  onSelectTicket: (ticketId: string) => void
}

const TicketColumn = ({ activeView, filteredTickets, scenarioMap, selectedTicketId, onSelectTicket }: Props) => (
  <section className="tickets-column">
    <div className="tickets-header">
      <div>
        <p className="eyebrow">{activeView?.label ?? 'Queue'}</p>
        <h2>{activeView?.description}</h2>
      </div>
      <p className="hero-blurb ticket-count-cta">
        {filteredTickets.length
          ? `Showing ${filteredTickets.length} ticket${filteredTickets.length > 1 ? 's' : ''}`
          : 'No tickets match this view and search yet.'}
      </p>
    </div>
    <ul className="ticket-list">
      {filteredTickets.length ? (
        filteredTickets.map((ticket) => {
          const scenario = scenarioMap.get(ticket.id)
          const isActive = selectedTicketId === ticket.id
          const countdownLabel = getCountdownLabel(ticket)
          const cardTimerStatus = getTimerStatus(ticket)
          const timerAssistive = timerStatusDescriptions[cardTimerStatus]
          return (
            <li key={ticket.id}>
              <button
                type="button"
                className={clsx('ticket-card', { active: isActive })}
                onClick={() => onSelectTicket(ticket.id)}
                aria-pressed={isActive}
                aria-label={`Open case "${ticket.subject}", ${ticket.priority} priority, currently ${ticket.status}`}
              >
                <div className="ticket-card-top">
                  <div>
                    <h3>{ticket.subject}</h3>
                    <p className="ticket-card-subtext">
                      {ticket.department} • {ticket.priority} priority • {ticket.status}
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
                  <span className="badge department" aria-label={`Department: ${ticket.department}`}>
                    <Flag size={12} aria-hidden="true" />
                    <span>{ticket.department}</span>
                  </span>
                  <span
                    className={clsx('badge status', ticket.status.toLowerCase().replace(/\s+/g, '-'))}
                    aria-label={`Status: ${ticket.status}`}
                  >
                    <ShieldAlert size={12} aria-hidden="true" />
                    <span>{ticket.status}</span>
                  </span>
                  <span className="badge priority" aria-label={`Priority: ${ticket.priority}`}>
                    <Zap size={12} aria-hidden="true" />
                    <span>{ticket.priority}</span>
                  </span>
                  <span className="badge severity" aria-label={`Severity: ${ticket.severity}`}>
                    <AlertTriangle size={12} aria-hidden="true" />
                    <span>{ticket.severity}</span>
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
          <p>No tickets match this view and search yet.</p>
          <p>Try clearing the search, picking a different view, or using the reset control above.</p>
        </li>
      )}
    </ul>
  </section>
)

export default TicketColumn
