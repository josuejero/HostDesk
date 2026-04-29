import { expect, test } from '@playwright/test'

test('authenticated sales-ops flow', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Need an account/i }).click()
  await page.getByLabel('Display name').fill('Playwright Tester')
  await page.getByLabel('Email').fill(`playwright-${Date.now()}@example.com`)
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: /Create account/i }).click()

  await expect(page.getByText(/records matching filters/i)).toBeVisible()

  await page.getByRole('button', { name: /Browse library/i }).click()
  await expect(page.getByText('Scenario catalog')).toBeVisible()

  await page.getByRole('button', { name: 'Jump into this scenario' }).first().click()
  await expect(page.getByText('Northline MSP Group', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: /Draft follow-up/i }).click()
  await expect(page.getByText('AI follow-up draft')).toBeVisible()
  await page.getByRole('button', { name: /Apply suggestion/i }).click()

  const composer = page.locator('.composer-panel')

  await expect(composer.getByLabel('Log activity')).toContainText('Hi Director of Cloud Services')
  await composer.getByLabel('Outcome').fill('Sent')
  await composer.getByRole('textbox', { name: /^Next step$/ }).fill('Propose a discovery call after sharing the cost narrative.')
  await composer.getByLabel('Next touch due').fill('2026-03-30T10:00')
  await composer.getByRole('button', { name: /Log activity/i }).click()

  await expect(page.getByText(/Outbound email logged/i)).toBeVisible()
  await expect(page.locator('.conversation-stream').getByText('Hi Director of Cloud Services').first()).toBeVisible()

  await page.reload()
  await expect(page.locator('.conversation-stream').getByText('Hi Director of Cloud Services').first()).toBeVisible()

  await page.locator('.status-actions select').first().selectOption('Handoff ready')
  await page.getByRole('button', { name: /Apply stage/i }).click()

  await expect(page.getByText('Handoff ready stage applied.')).toBeVisible()

  await page.getByRole('button', { name: /Metrics/i }).click()
  await expect(page.getByRole('heading', { name: /Operational health from persisted activity/i })).toBeVisible()
  await expect(page.getByText(/Response rate/i)).toBeVisible()

  await page.getByRole('button', { name: /Logout/i }).click()
  await expect(page.getByRole('button', { name: /^Login$/i })).toBeVisible()
})

test('matched playbook note persists after reload', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Need an account/i }).click()
  await page.getByLabel('Display name').fill('Playwright Notes Tester')
  await page.getByLabel('Email').fill(`playwright-notes-${Date.now()}@example.com`)
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: /Create account/i }).click()

  await expect(page.getByText(/records matching filters/i)).toBeVisible()

  await page.getByRole('button', { name: /Browse library/i }).click()
  await page.getByRole('button', { name: 'Jump into this scenario' }).first().click()
  await expect(page.getByText('Northline MSP Group', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: /^Save note$/i }).first().click()
  await expect(page.getByText(/Added ".+" to the record playbooks/i)).toBeVisible()
  await expect(page.locator('.internal-notes-panel').getByText(/Matched playbook/i)).toBeVisible()

  await page.reload()

  await expect(page.getByText('Northline MSP Group', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.internal-notes-panel').getByText(/Matched playbook/i)).toBeVisible()
})
