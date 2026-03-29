import { Layers } from 'lucide-react'
import type { ScenarioSeed } from '../../types'

type Props = {
  scenarios: ScenarioSeed[]
  onSelectScenario: (recordId: string) => void
}

const ScenarioLibrary = ({ scenarios, onSelectScenario }: Props) => (
  <section className="scenario-library">
    <div className="panel panel--flat">
      <div className="panel-heading">
        <Layers size={18} />
        <h3>Scenario catalog</h3>
      </div>
      <div className="panel-body scenario-grid">
        {scenarios.map((scenario) => (
          <article key={scenario.id} className="scenario-card">
            <div>
              <p className="badge bucket">{scenario.bucket}</p>
              <h4>{scenario.title}</h4>
              <p>{scenario.description}</p>
            </div>
            <div className="scenario-meta">
              <p>Company: {scenario.record.company}</p>
              <p>Stage: {scenario.record.stage}</p>
              <p>Motion: {scenario.accountProfile.microsoftPriority}</p>
              <div className="tag-row">
                {scenario.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => onSelectScenario(scenario.record.id)}>
                Jump into this scenario
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
)

export default ScenarioLibrary
