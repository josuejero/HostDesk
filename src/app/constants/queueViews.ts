import type { ScenarioSeed, Ticket } from '../../types'

export type ViewDefinition = {
  id: string
  label: string
  description: string
  filter: (ticket: Ticket, scenario?: ScenarioSeed) => boolean
}

export const queueViews: ViewDefinition[] = [
  {
    id: 'open',
    label: 'Open',
    description: 'Fresh incidents that still need a proactive response.',
    filter: (ticket) => ['Open', 'New'].includes(ticket.status),
  },
  {
    id: 'high-priority',
    label: 'High Priority',
    description: 'Critical and urgent work that needs extra focus.',
    filter: (ticket) =>
      ['High', 'Urgent', 'Critical'].includes(ticket.priority) || ticket.severity === 'Critical',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Account, invoice, and suspension cases.',
    filter: (ticket, scenario) => {
      const departmentMatch =
        ticket.department.toLowerCase().includes('billing') || ticket.department.toLowerCase().includes('accounts')
      const bucketMatch = scenario?.bucket.toLowerCase().includes('billing')
      const tagMatch = scenario?.tags?.some((tag) => tag.toLowerCase().includes('billing'))
      return departmentMatch || bucketMatch || Boolean(tagMatch)
    },
  },
  {
    id: 'technical',
    label: 'Technical',
    description: 'Operations, plugins, and infrastructure incidents.',
    filter: (ticket, scenario) => {
      const departmentMatch =
        ticket.department.toLowerCase().includes('technical') || ticket.department.toLowerCase().includes('operations')
      const bucketMatch = scenario?.bucket.toLowerCase().includes('technical')
      const tagMatch = scenario?.tags?.some((tag) => /technical|ops|plugin|outage/.test(tag.toLowerCase()))
      return departmentMatch || bucketMatch || Boolean(tagMatch)
    },
  },
  {
    id: 'waiting',
    label: 'Waiting on Customer',
    description: 'Awaiting customer confirmation or follow-up.',
    filter: (ticket) => ticket.status === 'Waiting on Customer',
  },
  {
    id: 'escalated',
    label: 'Escalated',
    description: 'Cases already pushed to higher tiers.',
    filter: (ticket) => ticket.status === 'Escalated',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    description: 'Closed or resolved work ready for documentation.',
    filter: (ticket) => ticket.status.toLowerCase().includes('resolve'),
  },
]
