import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import DeskApp from '../app/DeskApp'
import { queueViews } from '../app/constants/queueViews'

describe('DeskApp integration', () => {
  it(
    'renders queue controls, timer labels, and the sidebar scorecard with a search filter',
    async () => {
      render(<DeskApp />)
      const searchInput = screen.getByPlaceholderText('Company, workload, stage, tag, or owner')

      const nav = screen.getByRole('navigation')
      const navWithin = within(nav)
      queueViews.forEach((view) => {
        expect(navWithin.getByRole('button', { name: new RegExp(view.label, 'i') })).toBeInTheDocument()
      })

      fireEvent.change(searchInput, { target: { value: 'Windows 365' } })
      expect(screen.getByText('1 records matching filters')).toBeInTheDocument()

      expect(screen.getByRole('heading', { name: /Operational scorecard/ })).toBeInTheDocument()
      expect(screen.getByText(/Total \d+\/100/)).toBeInTheDocument()
      expect(screen.getAllByLabelText(/Follow-up due soon|Next step is on track|Follow-up overdue|Next step missing/).length).toBeGreaterThan(0)
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
      expect(screen.getByText('Demo data reset. HostDesk sales-ops scenarios are back to baseline.')).toBeInTheDocument()

      await waitFor(
        () => expect(screen.queryByText('Demo data reset. HostDesk sales-ops scenarios are back to baseline.')).toBeNull(),
        { timeout: 6000 },
      )
    },
    10000,
  )
})
