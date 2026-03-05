import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { queueViews } from '../app/constants/queueViews'
import DeskApp from '../app/DeskApp'

describe('DeskApp integration', () => {

  it(
    'renders queue controls, timer labels, and the sidebar scorecard with a search filter',
    async () => {
    render(<DeskApp />)
    const searchInput = screen.getByPlaceholderText('Subject, department, tag, or assignee')

    const nav = screen.getByRole('navigation')
    const navWithin = within(nav)
    queueViews.forEach((view) => {
      expect(navWithin.getByRole('button', { name: new RegExp(view.label, 'i') })).toBeInTheDocument()
    })

    fireEvent.change(searchInput, { target: { value: 'Minecraft' } })
    expect(screen.getByText('1 tickets matching filters')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /Scorecard/ })).toBeInTheDocument()
    expect(screen.getByText(/Total \d+\/100/)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/SLA missed and ticket is overdue/).length).toBeGreaterThan(0)
    },
    10000,
  )

  it(
    'toggles the overlays and the reset toast',
    async () => {
    render(<DeskApp />)
    fireEvent.click(screen.getByRole('button', { name: /Browse library/i }))
    expect(screen.getByText('Scenario catalog')).toBeInTheDocument()

    const jumpButtons = screen.getAllByRole('button', { name: /Jump into this scenario/i })
    fireEvent.click(jumpButtons[0])
    await waitFor(() => expect(screen.queryByText('Scenario catalog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /Recruiter walkthrough/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Finish walkthrough/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: /Reset demo/i }))
    expect(screen.getByText('Demo data reset. Welcome back to square one!')).toBeInTheDocument()

    await waitFor(
      () => expect(screen.queryByText('Demo data reset. Welcome back to square one!')).toBeNull(),
      { timeout: 6000 },
    )
    },
    10000,
  )
})
