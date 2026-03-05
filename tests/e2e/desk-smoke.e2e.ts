import { expect, test } from '@playwright/test'

test('demo scenario flow', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Browse library/i }).click()
  await expect(page.getByText('Scenario catalog')).toBeVisible()

  await page.getByRole('button', { name: 'Jump into this scenario' }).first().click()
  await expect(page.getByText('Invoice paid, but site still suspended')).toBeVisible()

  await page.getByLabel('Compose reply').fill('Thanks for the patience; I’m on this and will update tomorrow.')
  await page.getByRole('button', { name: /Send reply/i }).click()
  await expect(page.getByText('Thanks for the patience; I’m on this and will update tomorrow.')).toBeVisible()

  await page.getByRole('button', { name: /Share article/i }).click()
  await expect(page.locator('text=Sharing KB')).toBeVisible()

  const narrativeLabels = [
    'Root cause documented',
    'Fix applied',
    'Follow-up message sent',
    'Prevention action captured',
  ]
  for (const label of narrativeLabels) {
    await page.getByLabel(label).fill('Documented narrative details')
  }

  await page.getByLabel('Article created or updated?').selectOption('yes')

  const closureMetric = page.locator('.panel-body.scorecard .score-metric', {
    hasText: 'Closure completeness',
  })
  await expect(closureMetric.getByText('10/10')).toBeVisible()

  await page.locator('.status-actions button', { hasText: 'Solved' }).click()
  await expect(page.getByText('Solved action queued.')).toBeVisible()
})
