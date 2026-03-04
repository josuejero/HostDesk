import { ShieldAlert, AlertTriangle, Flag, Clock, Sparkles } from 'lucide-react'
import type { ScenarioSeed, Ticket } from '../../types'
import type { RoutingInsights } from '../utils/routing'
import type { TimerStatus } from '../utils/timer'

type Props = {
  ticket: Ticket
  scenario?: ScenarioSeed
  routingInsights: RoutingInsights | null
  countdownLabel: string
  timerStatus: TimerStatus
  timerDescription: string
}

const TicketHeaderPanel = ({
  ticket,
  scenario,
  routingInsights,
  countdownLabel,
  timerStatus,
  timerDescription,
}: Props) => (
  <article className="ticket-header">
    <div className="ticket-chip">
      <span className="badge severity" aria-label={`Severity: ${ticket.severity}`}>
        <AlertTriangle size={12} aria-hidden="true" />
        <span>{ticket.severity}</span>
      </span>
      <span className="badge department" aria-label={`Department: ${ticket.department}`}>
        <Flag size={12} aria-hidden="true" />
        <span>{ticket.department}</span>
      </span>
      <span className={`badge status ${ticket.status.toLowerCase().replace(/\s+/g, '-')}`} aria-label={`Status: ${ticket.status}`}>
        <ShieldAlert size={12} aria-hidden="true" />
        <span>{ticket.status}</span>
      </span>
    </div>
    {routingInsights && (
      <>
        <div className="triage-bar">
          <div className="triage-pill">
            <span>Severity</span>
            <strong>{ticket.severity}</strong>
          </div>
          <div className="triage-pill">
            <span>Department</span>
            <strong>{ticket.department}</strong>
          </div>
          <div className="triage-pill">
            <span>SLA timer</span>
            <strong className="timer-value">
              <Clock size={14} />
              <span>{countdownLabel}</span>
            </strong>
          </div>
          <div className="triage-pill">
            <span>Current owner</span>
            <strong>{ticket.assignedTo}</strong>
          </div>
          <div className="triage-pill">
            <span>Escalation path</span>
            <strong>{routingInsights.escalationPath}</strong>
          </div>
          <div className="triage-pill">
            <span>Service plan</span>
            <strong>
              {ticket.plan}
              {scenario ? ` • ${scenario.customerProfile.planTier}` : ''}
            </strong>
          </div>
          <div className="triage-pill">
            <span>Invoice state</span>
            <strong>{ticket.invoiceState}</strong>
          </div>
          <div className="triage-pill">
            <span>Panel status</span>
            <strong>{routingInsights.panelStatus}</strong>
          </div>
        </div>
        <div className="routing-grid">
          <div className="routing-card">
            <span>Routing queue</span>
            <strong>{routingInsights.queueLabel}</strong>
            <p>{routingInsights.queueReason}</p>
          </div>
          <div className="routing-card">
            <span>SLA expectation</span>
            <strong>{routingInsights.slaHeadline}</strong>
            <p>{routingInsights.slaMessage}</p>
          </div>
          <div className="routing-card">
            <span>Billing urgency</span>
            <strong>{routingInsights.billingHeadline}</strong>
            <p>{routingInsights.billingMessage}</p>
          </div>
          <div className="routing-card">
            <span>Escalation signal</span>
            <strong>{routingInsights.escalationHeadline}</strong>
            <p>{routingInsights.escalationMessage}</p>
          </div>
        </div>
      </>
    )}
    <div className="header-row">
      <h2>{ticket.subject}</h2>
      <div
        className={`sla timer-${timerStatus}`}
        role="status"
        aria-live="polite"
        aria-label={`${timerDescription}. ${countdownLabel}`}
      >
        <Clock size={18} />
        <span>{countdownLabel}</span>
      </div>
    </div>
    <div className="metadata">
      <span>Plan: {ticket.plan}</span>
      <span>Priority: {ticket.priority}</span>
      <span>Escalation: {ticket.escalationTier}</span>
      <span>Assignee: {ticket.assignedTo}</span>
      <span>Invoice state: {ticket.invoiceState}</span>
    </div>
    <div className="escalation-path">
      <ShieldAlert size={16} />
      <span>{scenario?.escalationRules.path.join(' → ') || 'Escalation path unavailable'}</span>
    </div>
    {scenario && (
      <div className="customer-profile">
        <Sparkles size={16} />
        <span>
          {scenario.customerProfile.name} • {scenario.customerProfile.persona} • {scenario.customerProfile.planTier} • SLA {scenario.customerProfile.slaEntitlementMinutes}m
        </span>
      </div>
    )}
  </article>
)

export default TicketHeaderPanel
