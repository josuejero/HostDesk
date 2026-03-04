import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'
import { isCustomerMessage } from '../utils/helpers'
import type { ThreadEntry } from '../../types'

type ChecklistItem = {
  id: string
  label: string
  detail: string
  complete: boolean
}

type Props = {
  thread: ThreadEntry[]
  postmortemChecklist: ChecklistItem[]
  caseCloseReady: boolean
  onStatusAction: (action: 'waiting' | 'solved') => void
}

const ThreadPanel = ({ thread, postmortemChecklist, caseCloseReady, onStatusAction }: Props) => (
  <div className="panel conversation-panel">
    <div className="panel-heading">
      <MessageCircle size={18} />
      <div>
        <h3>Threaded communication</h3>
        <p className="muted">Customer messages and agent replies are separated here; attachments remain handy below.</p>
      </div>
    </div>
    <div className="panel-body conversation-body">
      <div className="conversation-stream">
        {thread.map((entry) => (
          <div
            key={entry.id}
            className={clsx('conversation-bubble', {
              'conversation-bubble--customer': isCustomerMessage(entry),
              'conversation-bubble--agent': !isCustomerMessage(entry),
            })}
          >
            <div className="conversation-bubble__meta">
              <strong>{entry.author}</strong>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
            <p>{entry.message}</p>
          </div>
        ))}
      </div>
      <div className="attachments-placeholder">
        <p>Attachments placeholder</p>
        <small>Drag logs, screenshots, or recordings here once attachments are enabled.</small>
      </div>
      <div className="status-actions">
        <button type="button" className="ghost-btn" onClick={() => onStatusAction('waiting')}>
          Waiting on customer
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => onStatusAction('solved')}
          disabled={!caseCloseReady}
          title={!caseCloseReady ? 'Complete the postmortem checklist before closing this ticket.' : undefined}
        >
          Solved
        </button>
      </div>
      {postmortemChecklist.length > 0 && (
        <div className="postmortem-checklist">
          <strong>Case-close checklist</strong>
          <p className="muted">Finish these steps before marking the ticket as solved.</p>
          <ul>
            {postmortemChecklist.map((item) => (
              <li key={item.id}>
                <div>
                  <span>{item.label}</span>
                  <small className="check-detail">{item.detail}</small>
                </div>
                <span className={clsx('check-status', { complete: item.complete })}>
                  {item.complete ? 'Complete' : 'Pending'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
)

export default ThreadPanel
