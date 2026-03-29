import { BookOpenCheck } from 'lucide-react'
import type { CRMHygieneReview, PlaybookStatus } from '../../types'

type Props = {
  review: CRMHygieneReview
  owner: string
  buyerPersona: string
  nextTouchDueAt: string
  disqualificationReason: string
  narrativeFields: readonly (keyof CRMHygieneReview)[]
  fieldLabels: Record<keyof CRMHygieneReview, string>
  onChange: (field: keyof CRMHygieneReview, value: string) => void
  onRecordFieldChange: (
    field: 'owner' | 'buyerPersona' | 'nextTouchDueAt' | 'disqualificationReason',
    value: string,
  ) => void
}

const PostmortemPanel = ({
  review,
  owner,
  buyerPersona,
  nextTouchDueAt,
  disqualificationReason,
  narrativeFields,
  fieldLabels,
  onChange,
  onRecordFieldChange,
}: Props) => (
  <div className="panel">
    <div className="panel-heading">
      <BookOpenCheck size={18} />
      <h3>CRM hygiene review</h3>
    </div>
    <div className="panel-body postmortem">
      <label>
        <span>Owner</span>
        <input value={owner} onChange={(event) => onRecordFieldChange('owner', event.target.value)} />
      </label>
      <label>
        <span>Buyer persona</span>
        <input value={buyerPersona} onChange={(event) => onRecordFieldChange('buyerPersona', event.target.value)} />
      </label>
      <label>
        <span>Next touch due</span>
        <input
          type="datetime-local"
          value={nextTouchDueAt}
          onChange={(event) => onRecordFieldChange('nextTouchDueAt', event.target.value)}
        />
      </label>
      <label>
        <span>Disqualification reason</span>
        <input
          value={disqualificationReason}
          onChange={(event) => onRecordFieldChange('disqualificationReason', event.target.value)}
          placeholder="Required only if the record moves to Disqualified"
        />
      </label>
      {narrativeFields.map((field) => (
        <label key={field}>
          <span>{fieldLabels[field]}</span>
          <textarea value={review[field]} onChange={(event) => onChange(field, event.target.value)} rows={2} />
        </label>
      ))}
      <label>
        <span>Playbook updated?</span>
        <select
          value={review.playbookStatus}
          onChange={(event) => onChange('playbookStatus', event.target.value as PlaybookStatus)}
        >
          <option value="">Select an answer</option>
          <option value="updated">Yes - playbook updated</option>
          <option value="not-needed">No - no playbook change needed</option>
        </select>
        <small className="muted">
          This keeps the record useful for pipeline hygiene and enablement review, not just activity logging.
        </small>
      </label>
    </div>
  </div>
)

export default PostmortemPanel
