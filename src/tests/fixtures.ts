import { cloneTicket } from '../app/utils/helpers'
import { scenarioCatalog } from '../data'
import type { PostmortemSection, ScenarioSeed, Scorecard, Ticket } from '../types'

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const baseScorecard: Scorecard = {
  total: 0,
  metrics: [
    { id: 'slaCompliance', label: 'SLA compliance', value: 0, max: 25, note: '' },
    { id: 'communication', label: 'Communication & empathy', value: 0, max: 20, note: '' },
    { id: 'technicalOwnership', label: 'Technical ownership', value: 0, max: 20, note: '' },
    { id: 'kbSelfService', label: 'KB & self-service', value: 0, max: 15, note: '' },
    { id: 'escalationJudgment', label: 'Escalation judgment', value: 0, max: 10, note: '' },
    { id: 'closureCompleteness', label: 'Closure completeness', value: 0, max: 10, note: '' },
  ],
}

export const basePostmortem: PostmortemSection = {
  rootCause: '',
  fix: '',
  followUp: '',
  prevention: '',
  knowledgeArticleStatus: '',
}

export const baseScenario = scenarioCatalog[0]

export const createTicket = (overrides: Partial<Ticket> = {}): Ticket => {
  const defaultTicket = cloneTicket(baseScenario.ticket)
  return {
    ...defaultTicket,
    ...overrides,
    postmortem: {
      ...basePostmortem,
      ...(overrides.postmortem ?? {}),
    },
    scorecard: overrides.scorecard ? deepClone(overrides.scorecard) : deepClone(baseScorecard),
    thread: overrides.thread ? deepClone(overrides.thread) : deepClone(defaultTicket.thread),
    internalNotes: overrides.internalNotes ? deepClone(overrides.internalNotes) : deepClone(defaultTicket.internalNotes),
    kbMatches: overrides.kbMatches ? [...overrides.kbMatches] : deepClone(defaultTicket.kbMatches),
  }
}

export const createScenario = (overrides: Partial<ScenarioSeed> = {}): ScenarioSeed => {
  const ticketOverrides = overrides.ticket ?? {}
  return {
    ...baseScenario,
    ...overrides,
    ticket: createTicket(ticketOverrides),
  }
}
