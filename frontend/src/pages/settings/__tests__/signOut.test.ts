/**
 * #3099 — the Settings sign-out leaves `/settings` before it ends the session.
 *
 * SEAM: the pure sequence, not the button. `renderToStaticMarkup` dispatches no
 * events, so the click handler is unreachable from this harness; what can be
 * proven is the order of the two effects, which is the whole defect. Same seam
 * as `deleteAccount.test.ts`, for the same bounce.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, vi } from 'vitest'
import { runSettingsSignOut } from '../signOut'

describe('the settings sign-out sequence', () => {
  it('leaves for the landing BEFORE the session is dropped', async () => {
    const order: string[] = []
    const run = runSettingsSignOut(
      () => {
        order.push('leave')
      },
      async () => {
        order.push('signOut')
      },
    )
    await run()
    expect(
      order,
      '/settings is a ProtectedRoute — signing out first bounces the reader to /?login=required',
    ).toEqual(['leave', 'signOut'])
  })

  /** The navigation is synchronous and cannot be held behind the request: a
   *  viewer still on `/settings` when the session drops is the bug. */
  it('has already left while the sign-out request is still in the air', () => {
    const leave = vi.fn()
    void runSettingsSignOut(leave, () => new Promise<void>(() => {}))()
    expect(leave).toHaveBeenCalledTimes(1)
  })

  /** The sequence only helps if the button uses it. No DOM here to click, so
   *  the wiring is held by reading the one file that draws the button. */
  it('is what the Settings button calls, never the bare context method', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(here, '..', 'sections', 'AccountSection.tsx'), 'utf8')
    expect(source).toContain('runSettingsSignOut(')
    expect(source).not.toContain('onClick={signOut}')
  })
})
