import { expect, type Page } from '@playwright/test'

import copy from '../src/locales/en/onboarding.json' with { type: 'json' }

const API = process.env.E2E_API_URL ?? 'http://localhost:8000'

export type WalkStep = 'title' | 1 | 2 | 3 | 4 | 5 | '5-voted' | 6 | 7 | 'contract' | 'signin' | 'character' | 'arrival'
export type OnStep = (step: WalkStep) => Promise<void>

/** The typed line is the visible half of the line box; equal to the catalog line means the beat is complete. */
export const lineSettled = (page: Page, n: number) =>
  expect(page.locator('.ob-line-text')).toHaveText(copy.beats[String(n) as '1'], { timeout: 15_000 })

export async function openTitle(page: Page) {
  await page.goto('/')
  await expect(page.locator('.ob-h1')).toHaveText(copy.flow.welcome, { timeout: 15_000 })
  await expect(page.getByTestId('onboarding-start')).toBeVisible()
}

export async function vote(page: Page) {
  await page.locator('.ob-stage button[aria-pressed]').nth(3).click()
  await expect(page.getByText('You voted 4 of 5')).toBeVisible()
}

/** Next on beats 1 to 7, voting at 5. `onStep` runs on each settled frame, before leaving it. */
export async function passBeats(page: Page, onStep?: OnStep) {
  for (let n = 1; n <= 7; n++) {
    await expect(page.getByText(`${n} / 7`, { exact: true })).toBeVisible()
    await lineSettled(page, n)
    await onStep?.(n as WalkStep)
    if (n === 5) {
      await vote(page)
      await onStep?.('5-voted')
    }
    await page.getByRole('button', { name: n === 7 ? copy.flow.toContract : copy.flow.next, exact: true }).click()
  }
  await expect(page.getByTestId('onboarding-accept-terms')).toBeVisible()
}

/** Contract to arrival. dev-login stands in for OAuth, and the sessionStorage marks are what the real sign-in click sets before it leaves. */
export async function signInAndArrive(page: Page, onStep?: OnStep) {
  await onStep?.('contract')
  await page.getByTestId('onboarding-accept-terms').click()
  await expect(page.getByRole('heading', { name: copy.auth.title })).toBeVisible()
  await onStep?.('signin')
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`

  const res = await page.request.post(`${API}/auth/dev-login?key=walk-${stamp}`)
  expect(res.ok(), 'dev-login failed — is the backend up?').toBeTruthy()
  await page.evaluate(() => {
    sessionStorage.setItem('wz_onboarding_handoff', 'true')
    sessionStorage.setItem('wz_terms_accepted', 'true')
  })
  await page.goto('/start')

  const name = `Walker ${stamp}`
  await page.getByRole('textbox', { name: 'Character name' }).fill(name)
  await onStep?.('character')
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByRole('heading', { name: copy.arrival.entered.replace('{{name}}', name) })).toBeVisible()
  await onStep?.('arrival')
}
