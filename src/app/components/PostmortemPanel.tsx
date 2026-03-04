import { BookOpenCheck } from 'lucide-react'
import type { KnowledgeArticleStatus, PostmortemSection } from '../../types'

type Props = {
  postmortem: PostmortemSection
  narrativeFields: readonly (keyof PostmortemSection)[]
  fieldLabels: Record<keyof PostmortemSection, string>
  onChange: (field: keyof PostmortemSection, value: string) => void
}

const PostmortemPanel = ({ postmortem, narrativeFields, fieldLabels, onChange }: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <BookOpenCheck size={18} />
      <h3>Postmortem</h3>
    </div>
    <div className="panel-body postmortem">
      {narrativeFields.map((field) => (
        <label key={field}>
          <span>{fieldLabels[field]}</span>
          <textarea value={postmortem[field]} onChange={(event) => onChange(field, event.target.value)} rows={2} />
        </label>
      ))}
      <label>
        <span>Article created or updated?</span>
        <select
          value={postmortem.knowledgeArticleStatus}
          onChange={(event) => onChange('knowledgeArticleStatus', event.target.value as KnowledgeArticleStatus)}
        >
          <option value="">Select an answer</option>
          <option value="yes">Yes – article created or updated</option>
          <option value="no">No – no KB work was needed</option>
        </select>
        <small className="muted">
          Capturing whether this case resulted in a KB update keeps knowledge reporting alive.
        </small>
      </label>
    </div>
  </div>
)

export default PostmortemPanel
