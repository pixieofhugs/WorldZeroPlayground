/**
 * #1773 — the logged-out surfaces can reach BOTH providers.
 *
 * Discord's backend leg shipped in #1772 and was unreachable from the UI:
 * `NavBar` and `Home` both called `loginWithGoogle()` directly. What is pinned
 * here is the thing that regressed once and would regress silently again —
 * that a third provider added to the backend, or a careless edit to either
 * entry point, cannot leave a live route with no button pointing at it.
 *
 * The framing assertion is #1738's surviving constraint: a provider is named on
 * the button that goes to it and NOWHERE else. "Sign in with Google" as a
 * heading is the wrong shape even while Google is the only provider that works.
 *
 * `drawAtRoot` renders inline with no `document` (the harness has none), which
 * is what makes the sheet's contents assertable at all.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const loginWith = vi.fn()
vi.mock('../../api/auth', () => ({ loginWith: (p: string) => loginWith(p) }))

import SignInOptions, { SignInSheet } from '../SignInOptions'

describe('SignInOptions', () => {
  it('offers every provider the backend serves a leg for', () => {
    const markup = renderToStaticMarkup(<SignInOptions />)

    expect(markup).toContain('data-testid="sign-in-google"')
    expect(markup).toContain('data-testid="sign-in-discord"')
    expect(markup).toContain('Continue with Google')
    expect(markup).toContain('Continue with Discord')
  })

  it('gives neither provider the visual primacy of being the default', () => {
    const markup = renderToStaticMarkup(<SignInOptions />)
    const classes = [...markup.matchAll(/class="([^"]*)"/g)].map((m) => m[1])

    expect(classes).toHaveLength(2)
    expect(classes[0]).toBe(classes[1])
  })
})

describe('SignInSheet', () => {
  it('draws nothing until it is opened', () => {
    expect(renderToStaticMarkup(<SignInSheet open={false} onClose={() => {}} />)).toBe('')
  })

  it('opens both ways in, under framing copy that names neither (#1738)', () => {
    const markup = renderToStaticMarkup(<SignInSheet open onClose={() => {}} />)

    expect(markup).toContain('data-testid="sign-in-google"')
    expect(markup).toContain('data-testid="sign-in-discord"')

    // The dialog's own title and label — everything that is not a button.
    const framing = markup.replace(/<button[\s\S]*?<\/button>/g, '')
    expect(framing).toContain('Somewhere to keep your score')
    expect(framing).not.toMatch(/Google|Discord/)
  })

  it('is a labelled modal, not a bare div', () => {
    const markup = renderToStaticMarkup(<SignInSheet open onClose={() => {}} />)

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
  })
})
