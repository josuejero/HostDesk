import { MessageCircle } from 'lucide-react'
import type { ActivityEntry } from '../../types'

type Props = {
  researchActivities: ActivityEntry[]
}

const InternalNotesPanel = ({ researchActivities }: Props) => (
  <div className="panel internal-notes-panel">
    <div className="panel-heading">
      <MessageCircle size={18} />
      <h3>Research notes</h3>
    </div>
    <div className="panel-body">
      {researchActivities.map((note) => (
        <div key={note.id} className="thread-entry internal">
          <div className="thread-meta">
            <strong>{note.owner}</strong>
            <span>{new Date(note.timestamp).toLocaleString()}</span>
          </div>
          <p>{note.summary}</p>
          <small className="muted">
            {note.outcome} · next step: {note.nextStep}
          </small>
        </div>
      ))}
      {!researchActivities.length && <p className="muted">No research-only notes yet.</p>}
    </div>
  </div>
)

export default InternalNotesPanel
