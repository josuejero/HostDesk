import { ShieldAlert, AlertTriangle, Flag, Clock, Sparkles } from 'lucide-react'
import type { ProspectRecord, ScenarioSeed } from '../../types'
import type { RoutingInsights } from '../utils/routing'
import type { TimerStatus } from '../utils/timer'

type Props = {
  record: ProspectRecord
  scenario?: ScenarioSeed
  routingInsights: RoutingInsights | null
  countdownLabel: string
  timerStatus: TimerStatus
  timerDescription: string
}

const TicketHeaderPanel = ({
  record,
  scenario,
  routingInsights,
  countdownLabel,
  timerStatus,
  timerDescription,
}: Props) => (
  <article className="ticket-header">
    <div className="ticket-chip">
      <span className="badge severity" aria-label={`Motion: ${routingInsights?.microsoftMotion ?? 'Mixed motion'}`}>
        <AlertTriangle size={12} aria-hidden="true" />
        <span>{routingInsights?.microsoftMotion ?? 'Mixed motion'}</span>
      </span>
      <span className="badge department" aria-label={`Segment: ${record.segment}`}>
        <Flag size={12} aria-hidden="true" />
        <span>{record.segment}</span>
      </span>
      <span
        className={`badge status ${record.stage.toLowerCase().replace(/\s+/g, '-')}`}
        aria-label={`Stage: ${record.stage}`}
      >
        <ShieldAlert size={12} aria-hidden="true" />
        <span>{record.stage}</span>
      </span>
    </div>
    {routingInsights && (
      <>
        <div className="triage-bar">
          <div className="triage-pill">
            <span>Company</span>
            <strong>{record.company}</strong>
          </div>
          <div className="triage-pill">
            <span>Persona</span>
            <strong>{record.buyerPersona || 'Still researching'}</strong>
          </div>
          <div className="triage-pill">
            <span>Next step due</span>
            <strong className="timer-value">
              <Clock size={14} />
              <span>{countdownLabel}</span>
            </strong>
          </div>
          <div className="triage-pill">
            <span>Current owner</span>
            <strong>{record.owner || 'Unassigned'}</strong>
          </div>
          <div className="triage-pill">
            <span>Handoff path</span>
            <strong>{scenario?.handoffPlan.path.join(' → ') ?? 'Path pending'}</strong>
          </div>
          <div className="triage-pill">
            <span>Lead source</span>
            <strong>{record.leadSource}</strong>
          </div>
          <div className="triage-pill">
            <span>Microsoft focus</span>
            <strong>{routingInsights.microsoftMotion}</strong>
          </div>
          <div className="triage-pill">
            <span>CRM completeness</span>
            <strong>{record.crmCompleteness}%</strong>
          </div>
        </div>
        <div className="routing-grid">
          <div className="routing-card">
            <span>Routing queue</span>
            <strong>{routingInsights.queueLabel}</strong>
            <p>{routingInsights.queueReason}</p>
          </div>
          <div className="routing-card">
            <span>ICP fit</span>
            <strong>{routingInsights.icpHeadline}</strong>
            <p>{routingInsights.icpMessage}</p>
          </div>
          <div className="routing-card">
            <span>Microsoft relevance</span>
            <strong>{routingInsights.microsoftHeadline}</strong>
            <p>{routingInsights.microsoftMessage}</p>
          </div>
          <div className="routing-card">
            <span>Urgency</span>
            <strong>{routingInsights.urgencyHeadline}</strong>
            <p>{routingInsights.urgencyMessage}</p>
          </div>
          <div className="routing-card">
            <span>Recommended channel</span>
            <strong>{routingInsights.channelHeadline}</strong>
            <p>{routingInsights.channelMessage}</p>
          </div>
          <div className="routing-card">
            <span>Handoff status</span>
            <strong>{routingInsights.handoffHeadline}</strong>
            <p>{routingInsights.handoffMessage}</p>
          </div>
          <div className="routing-card">
            <span>Data hygiene</span>
            <strong>{routingInsights.dataHygieneHeadline}</strong>
            <p>{routingInsights.dataHygieneMessage}</p>
          </div>
        </div>
      </>
    )}
    <div className="header-row">
      <h2>{record.subject}</h2>
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
      <span>Use case: {record.useCase}</span>
      <span>Stage: {record.stage}</span>
      <span>Owner: {record.owner || 'Unassigned'}</span>
      <span>Last touch: {new Date(record.lastTouchAt).toLocaleString()}</span>
      <span>Employee range: {record.employeeRange}</span>
    </div>
    <div className="escalation-path">
      <ShieldAlert size={16} />
      <span>{scenario?.handoffPlan.path.join(' → ') || 'Handoff path unavailable'}</span>
    </div>
    {scenario && (
      <div className="customer-profile">
        <Sparkles size={16} />
        <span>
          {scenario.accountProfile.name} • {scenario.accountProfile.existingStack} • {scenario.accountProfile.motion}
        </span>
      </div>
    )}
  </article>
)

export default TicketHeaderPanel
