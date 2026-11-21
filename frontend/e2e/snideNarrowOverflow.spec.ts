import { test, expect } from '@playwright/test'

import { THEME_STORAGE_KEY } from '../src/hooks/useTheme'

/* #3836: Snide's nowrap stencil headings were 27px wider than a 320px phone. */
test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 320, height: 568 },
  hasTouch: true,
})

for (const theme of ['light', 'dark'] as const) {
  test(`/factions/snide fits 320px · ${theme}`, async ({ page }) => {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [THEME_STORAGE_KEY, theme])
    await page.goto('/factions/snide')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBe(clientWidth)
  })
}
