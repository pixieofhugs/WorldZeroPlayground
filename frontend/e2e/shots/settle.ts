import type { Page } from '@playwright/test'

// Late content (per-viewer actions, labels) lands after networkidle: wait for
// fonts, then for 300ms without DOM mutations, giving up after 5s.
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(
    () =>
      document.fonts.ready.then(
        () =>
          new Promise<void>((done) => {
            let quiet: ReturnType<typeof setTimeout>
            const finish = () => {
              obs.disconnect()
              clearTimeout(quiet)
              clearTimeout(cap)
              done()
            }
            const arm = () => {
              clearTimeout(quiet)
              quiet = setTimeout(finish, 300)
            }
            const obs = new MutationObserver(arm)
            obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
            const cap = setTimeout(finish, 5000)
            arm()
          }),
      ),
  )
}
