import scenarioRaw from '../../data/scenario-catalog.json' assert { type: 'json' }
import kbRaw from '../../data/kb-articles.json' assert { type: 'json' }
import cannedRaw from '../../data/canned-replies.json' assert { type: 'json' }
import rubricRaw from '../../data/scoring-rubric.json' assert { type: 'json' }

import type {
  OutreachTemplate,
  PlaybookArticle,
  ScenarioSeed,
  ScoringRubric,
} from '../types'

export const scenarioCatalog: ScenarioSeed[] = scenarioRaw as ScenarioSeed[]
export const kbArticles: PlaybookArticle[] = kbRaw as PlaybookArticle[]
export const cannedReplies: OutreachTemplate[] = cannedRaw as OutreachTemplate[]
export const scoringRubric: ScoringRubric = rubricRaw as ScoringRubric
