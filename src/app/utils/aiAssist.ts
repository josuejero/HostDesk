import type { AiSuggestion, AiSuggestionKind, PlaybookArticle, ProspectRecord, ScenarioSeed } from '../../types'
import { getMicrosoftMotion, getRecommendedChannel } from './routing'

const formatPlaybookList = (playbooks: PlaybookArticle[]) =>
  playbooks.slice(0, 2).map((playbook) => playbook.title).join(' and ')

export const buildAiSuggestion = (
  kind: AiSuggestionKind,
  record: ProspectRecord,
  scenario: ScenarioSeed | undefined,
  playbooks: PlaybookArticle[],
): AiSuggestion => {
  const motion = getMicrosoftMotion(record, scenario)
  const recommendedChannel = getRecommendedChannel(record, scenario)
  const playbookText = playbooks.length ? formatPlaybookList(playbooks) : 'the matched playbooks'
  const primaryPain = record.painPoints[0] ?? record.useCase
  const primarySignal = record.buyingSignals[0] ?? 'there is still interest to validate'

  if (kind === 'summary') {
    return {
      kind,
      headline: 'AI account summary',
      body: `${record.company} is a ${record.segment.toLowerCase()} account focused on ${motion}. The main pain point is ${primaryPain.toLowerCase()}, and the clearest buying signal is that ${primarySignal.toLowerCase()}. Use ${playbookText} to keep the follow-up specific.`,
      applied: false,
    }
  }

  if (kind === 'next-step') {
    return {
      kind,
      headline: 'AI next-best action',
      body: `Recommended channel: ${recommendedChannel}. Anchor the next touch on ${primaryPain.toLowerCase()}, reinforce the ${motion} angle, and make the next step explicit before the record goes stale.`,
      applied: false,
    }
  }

  return {
    kind,
    headline: 'AI follow-up draft',
    body: `Hi ${record.buyerPersona || 'team'},\n\nI wanted to follow up on ${record.useCase.toLowerCase()}. Based on what you shared about ${primaryPain.toLowerCase()}, the most relevant angle looks like ${motion}. If helpful, I can send a short summary from ${playbookText} and outline a practical next step for your team.\n\nBest,\n${record.owner || 'HostDesk SDR'}`,
    applied: false,
  }
}
