import { test, type Page } from '@playwright/test'

// Late content (per-viewer actions, labels) lands after networkidle: wait for
// fonts, then for 300ms without DOM mutations, giving up after 5s.
// Returns false (and tags the shot `unsettled`) when the cap fired instead.
export async function settle(page: Page): Promise<boolean> {
  await page.waitForLoadState('networkidle')
  const quiet = await page.evaluate(
    () =>
      document.fonts.ready.then(
        () =>
          new Promise<boolean>((done) => {
            let quiet: ReturnType<typeof setTimeout>
            const finish = (settled: boolean) => {
              obs.disconnect()
              clearTimeout(quiet)
              clearTimeout(cap)
              done(settled)
            }
            const arm = () => {
              clearTimeout(quiet)
              quiet = setTimeout(() => finish(true), 300)
            }
            const obs = new MutationObserver(arm)
            obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
            const cap = setTimeout(() => finish(false), 5000)
            arm()
          }),
      ),
  )
  if (!quiet) {
    console.warn(`settle: ${page.url()} still mutating after 5s`)
    test.info().annotations.push({ type: 'unsettled', description: page.url() })
  }
  return quiet
}
