import type { PlaybookArticle } from '../../types'

export type SubjectTrigger = {
  id: string
  headline: string
  description: string
  keywords: string[]
  articleLabels: string[]
  tips: string[]
}

export type GuidedEntry = SubjectTrigger & {
  articles: PlaybookArticle[]
}

export const subjectTriggers: SubjectTrigger[] = [
  {
    id: 'avd-migration',
    headline: 'AVD migration angle',
    description: 'Citrix, VDI, or session-host language points to an AVD migration story.',
    keywords: ['citrix', 'vdi', 'session host', 'avd'],
    articleLabels: ['avd-migration', 'avd-cost-control'],
    tips: [
      'Clarify whether the pain is cost, operational complexity, or user experience.',
      'Find out which desktop workloads are candidates for a phased migration first.',
      'Use cost and governance language, not just generic migration language.',
    ],
  },
  {
    id: 'windows365-byod',
    headline: 'Windows 365 contractor angle',
    description: 'Cloud PC, contractor, and BYOD wording signals a Windows 365 motion.',
    keywords: ['cloud pc', 'windows 365', 'contractor', 'byod'],
    articleLabels: ['windows365-byod'],
    tips: [
      'Tie the motion to onboarding speed and device trust, not just desktop convenience.',
      'Capture whether the team needs persistent or short-lived worker desktops.',
      'Ask who owns contractor security policy so the conversation stays practical.',
    ],
  },
  {
    id: 'intune-compliance',
    headline: 'Intune compliance angle',
    description: 'Compliance, policy, and endpoint language should trigger the Intune playbook.',
    keywords: ['intune', 'compliance', 'policy', 'endpoint', 'app deployment'],
    articleLabels: ['intune-compliance', 'pipeline-hygiene'],
    tips: [
      'Confirm whether the main pain is reporting, enforcement, or app deployment confidence.',
      'Look for audit timing or policy exceptions that raise urgency.',
      'Document how the team measures success today so the story is operational, not abstract.',
    ],
  },
  {
    id: 'cost-optimization',
    headline: 'Cost optimization angle',
    description: 'Spend and optimization language usually means the cost-control playbook should surface immediately.',
    keywords: ['cost', 'optimize', 'azure spend', 'margin'],
    articleLabels: ['avd-cost-control', 'msp-motion'],
    tips: [
      'Translate the desktop problem into spend, margin, or efficiency language.',
      'Look for after-hours or scaling behavior that could support a stronger follow-up.',
      'Keep the story measurable so finance and operations both care.',
    ],
  },
  {
    id: 'msp-motion',
    headline: 'MSP multi-tenant angle',
    description: 'Managed client and multi-tenant language should pull MSP-specific discovery guidance into view.',
    keywords: ['msp', 'managed clients', 'multi-tenant', 'partner'],
    articleLabels: ['msp-motion'],
    tips: [
      'Ask how many customer environments the team has to operate today.',
      'Look for repeatability or governance pain across tenants.',
      'Keep the next step tied to partner economics or engineer time savings.',
    ],
  },
]
