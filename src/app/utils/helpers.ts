import { scenarioCatalog } from '../../data'
import type { DemoState, Ticket, ThreadEntry } from '../../types'

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const cloneTicket = (ticket: Ticket) => JSON.parse(JSON.stringify(ticket)) as Ticket

export const isCustomerMessage = (entry: ThreadEntry) =>
  entry.audience === 'customer' && entry.author.toLowerCase().includes('customer')

export const getInitialState = (): DemoState => {
  const cloned = scenarioCatalog.map((scenario) => cloneTicket(scenario.ticket))
  return {
    tickets: cloned,
    selectedTicketId: cloned[0]?.id ?? '',
    walkthroughActive: false,
    showScenarioLibrary: false,
  }
}
