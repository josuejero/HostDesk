import { MessageCircle } from 'lucide-react'
import type { ThreadEntry } from '../../types'

type Props = {
  internalNotes: ThreadEntry[]
}

const InternalNotesPanel = ({ internalNotes }: Props) => (
  <div className="panel internal-notes-panel">
    <div className="panel-heading">
      <MessageCircle size={18} />
      <h3>Internal notes</h3>
    </div>
    <div className="panel-body">
      {internalNotes.map((note) => (
        <div key={note.id} className="thread-entry internal">
          <div className="thread-meta">
            <strong>{note.author}</strong>
            <span>{new Date(note.createdAt).toLocaleString()}</span>
          </div>
          <p>{note.message}</p>
        </div>
      ))}
      {!internalNotes.length && <p className="muted">No private notes yet.</p>}
    </div>
  </div>
)

export default InternalNotesPanel
