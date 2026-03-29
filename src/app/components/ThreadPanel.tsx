import { MessageCircle } from 'lucide-react'
import type { ActivityEntry, LeadStage } from '../../types'

type Props = {
  activities: ActivityEntry[]
  aiSummary: string
  recommendedNextAction: string
  stageOptions: LeadStage[]
  selectedStage: LeadStage
  setSelectedStage: (value: LeadStage) => void
  onApplyStageChange: () => void
}

const ThreadPanel = ({
  activities,
  aiSummary,
  recommendedNextAction,
  stageOptions,
  selectedStage,
  setSelectedStage,
  onApplyStageChange,
}: Props) => (
  <div className="panel conversation-panel">
    <div className="panel-heading">
      <MessageCircle size={18} />
      <div>
        <h3>Activity timeline</h3>
        <p className="muted">Every touch, reply, stage change, and AI action is logged here for pipeline review.</p>
      </div>
    </div>
    <div className="panel-body conversation-body">
      <div className="conversation-stream">
        {activities.map((activity) => (
          <div key={activity.id} className="conversation-bubble conversation-bubble--agent">
            <div className="conversation-bubble__meta">
              <strong>{activity.owner}</strong>
              <span>{new Date(activity.timestamp).toLocaleString()}</span>
            </div>
            <p>
              <strong>{activity.outcome}</strong> · {activity.summary}
            </p>
            <small className="muted">
              {activity.channel} · next step: {activity.nextStep} · CRM updated: {activity.crmUpdated ? 'Yes' : 'No'}
            </small>
          </div>
        ))}
      </div>
      <div className="attachments-placeholder">
        <p>AI summary</p>
        <small>{aiSummary}</small>
      </div>
      <div className="attachments-placeholder">
        <p>Recommended next action</p>
        <small>{recommendedNextAction}</small>
      </div>
      <div className="status-actions">
        <select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value as LeadStage)}>
          {stageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <button type="button" className="ghost-btn" onClick={onApplyStageChange}>
          Apply stage
        </button>
      </div>
    </div>
  </div>
)

export default ThreadPanel
