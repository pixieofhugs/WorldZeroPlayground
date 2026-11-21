import { test, expect, type Page } from '@playwright/test'

import copy from '../src/locales/en/onboarding.json' with { type: 'json' }
import { openTitle, passBeats, signInAndArrive, type WalkStep } from './onboardingWalk'

test.use({ storageState: { cookies: [], origins: [] } })

interface Tabbable { label: string; cls: string; x: number; y: number; w: number; h: number; inHidden: boolean }

const tabbables = (page: Page): Promise<Tabbable[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.ob-root :is(a[href],button,input,select,textarea,[tabindex])')]
      .filter((e) => e.tabIndex >= 0 && !e.closest('[inert]') && !(e as HTMLButtonElement).disabled && e.getClientRects().length > 0)
      .map((e) => {
        const r = e.getBoundingClientRect()
        return {
          label: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30),
          cls: String(e.className),
          x: r.x, y: r.y, w: e.offsetWidth, h: e.offsetHeight,
          inHidden: !!e.closest('[aria-hidden="true"]'),
        }
      }),
  )

const activeTag = (page: Page) => page.evaluate(() => document.activeElement?.tagName)

async function checkStep(page: Page, step: WalkStep) {
  // The title is a page load, not a step change: nothing has moved focus yet.
  if (step !== 'title') expect(await activeTag(page), `focus fell to <body> at ${step}`).not.toBe('BODY')

  // The vote row sits below the fold until the beat scrolls it up; measure it where a player sees it.
  if (step === 5) await page.locator('.ob-stage button[aria-pressed]').first().scrollIntoViewIfNeeded()
  // Entrances like ob-toss tilt a whole row of controls for a second; measuring mid-toss flaked main red.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => {
      const target = (a.effect as KeyframeEffect | null)?.target
      return a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity || !target ||
        !target.matches(':is(a[href],button,input,select,textarea,[tabindex]), :has(a[href],button,input,select,textarea,[tabindex])')
    }),
  )
  const found = await tabbables(page)
  for (const el of found) {
    expect(el.inHidden, `${step}: "${el.label}" is tabbable inside aria-hidden`).toBe(false)
    // Beat 5's balloons are 24px at the fit floor (#3572); every other control is a 44px target.
    const min = step === 5 && el.cls.includes('balloon') ? 24 : 44
    expect(Math.min(el.w, el.h), `${step}: "${el.label}" (${el.cls}) is ${el.w}x${el.h}`).toBeGreaterThanOrEqual(min)
  }
  for (let i = 1; i < found.length; i++) {
    const a = found[i - 1]
    const b = found[i]
    const sameRow = Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) < Math.max(a.h, b.h) / 2
    expect(sameRow ? b.x >= a.x : b.y >= a.y, `${step}: Tab goes from "${a.label}" to "${b.label}" against the visible order (${JSON.stringify([a, b])})`).toBe(true)
  }
}

test('a guest walks title to arrival; Back retraces; focus never lands on body', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await openTitle(page)
  await checkStep(page, 'title')

  await page.getByTestId('onboarding-start').click()
  await passBeats(page, (s) => checkStep(page, s))

  for (let n = 7; n >= 1; n--) {
    await page.getByRole('button', { name: copy.flow.back, exact: true }).click()
    await expect(page.getByText(`${n} / 7`, { exact: true })).toBeVisible()
    expect(await activeTag(page), `Back to ${n}`).not.toBe('BODY')
  }
  await page.getByRole('button', { name: copy.flow.back, exact: true }).click()
  await expect(page.getByTestId('onboarding-start')).toBeFocused()
  await page.getByTestId('onboarding-start').click()
  await page.getByTestId('onboarding-skip').click()

  await signInAndArrive(page, (s) => checkStep(page, s))
  expect(errors, errors.join('\n')).toHaveLength(0)
})

test('motion switch off: key elements rest on their settled frame', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => localStorage.setItem('wz-motion', 'off'))
  // Each is hidden or at a start pose in its 0% keyframe, so animation:none must not fall back to it.
  const rest: [WalkStep, string, string, string][] = [
    [1, '.b1 .bfly', 'opacity', '1'],
    [1, '.b1 .b1x', 'transform', 'matrix(1, 0, 0, 1, 308, 0)'],
    [2, '.b2-nm:first-child', 'opacity', '1'],
    [2, '.b2-a1', 'opacity', '1'],
    [5, '.b5-arrow path', 'strokeDashoffset', '0px'],
    [6, '.b6x', 'transform', 'matrix(1, 0, 0, 1, 266, 0)'],
    [6, '.b6-roll', 'transform', 'matrix(1, 0, 0, 1, 0, -48)'],
    [7, '.b7 .kern', 'opacity', '0'],
    [7, '.b7 .clw', 'opacity', '0'],
    [7, '.b7 .trail', 'opacity', '0'],
  ]
  await openTitle(page)
  await expect(page.locator('.ob-aurora')).toHaveCSS('opacity', /^0\.\d+$/)
  await expect(page.locator('.ob-snz .eyes')).toHaveCSS('opacity', '1')
  await page.getByTestId('onboarding-start').click()
  await passBeats(page, async (step) => {
    for (const [at, sel, prop, want] of rest) {
      if (at === step) await expect(page.locator(sel).first(), `${step} ${sel}`).toHaveCSS(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), want)
    }
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('every step is complete and still', async ({ page }) => {
    const still = async (step: WalkStep) => {
      // The caret blinks forever by design; anything else running is motion.
      const moving = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && !(a.effect as KeyframeEffect | null)?.target?.classList.contains('ob-caret'))
          .map((a) => `${(a.effect as KeyframeEffect | null)?.target?.className} ${(a as CSSAnimation).animationName}`),
      )
      expect(moving, `${step} still animates`).toEqual([])
    }
    await openTitle(page)
    await still('title')
    await page.getByTestId('onboarding-start').click()
    await passBeats(page, still)
    await signInAndArrive(page, still)
  })
})
