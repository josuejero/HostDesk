import scenarioRaw from '../../data/scenario-catalog.json' assert { type: 'json' }
import kbRaw from '../../data/kb-articles.json' assert { type: 'json' }
import cannedRaw from '../../data/canned-replies.json' assert { type: 'json' }
import rubricRaw from '../../data/scoring-rubric.json' assert { type: 'json' }

import type {
  CannedReply,
  KBArticle,
  ScenarioSeed,
  ScoringRubric,
} from '../types'

export const scenarioCatalog: ScenarioSeed[] = scenarioRaw as ScenarioSeed[]
export const kbArticles: KBArticle[] = kbRaw as KBArticle[]
export const cannedReplies: CannedReply[] = cannedRaw as CannedReply[]
export const scoringRubric: ScoringRubric = rubricRaw as ScoringRubric
