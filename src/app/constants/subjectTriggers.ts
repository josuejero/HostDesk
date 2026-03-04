import type { KBArticle } from '../../types'

export type SubjectTrigger = {
  id: string
  headline: string
  description: string
  keywords: string[]
  articleLabels: string[]
  tips: string[]
}

export type GuidedEntry = SubjectTrigger & {
  articles: KBArticle[]
}

export const subjectTriggers: SubjectTrigger[] = [
  {
    id: 'plugin-troubleshooting',
    headline: 'Plugin troubleshooting',
    description: 'Subject shows plugin/mod/jar hints — pair with the plugin catalog before replying.',
    keywords: ['plugin', 'mod', 'jar'],
    articleLabels: ['plugin-troubleshooting'],
    tips: [
      'Review jar versions and plugin dependencies that load during the crash.',
      'Boot without the new plugin to confirm if it is the culprit.',
      'Inspect the modpack order and server logs for stack overflows.',
    ],
  },
  {
    id: 'billing-suspension',
    headline: 'Billing suspension & payment propagation',
    description: 'Billing keywords suggest invoice or suspension holds — surface the suspension + activation KB.',
    keywords: ['paid', 'invoice', 'suspended'],
    articleLabels: ['billing-suspension', 'payment-propagation'],
    tips: [
      'Reconfirm the invoice state in accounting and clear the suspension flag.',
      'Watch for propagation delays before the panel truly reflects the payment.',
      'Double-check the control panel or API to prove the service is active.',
    ],
  },
  {
    id: 'latency-checklist',
    headline: 'Latency triage checklist',
    description: '“Lag” or “high ping” signals trigger a latency-focused checklist.',
    keywords: ['lag', 'high ping'],
    articleLabels: ['latency-checklist'],
    tips: [
      'Capture ping traces and compare them to historical baselines.',
      'Look for cron jobs or backups that might align with the spikes.',
      'Glean whether remote hops or edge routers are contributing to the lag.',
    ],
  },
]
