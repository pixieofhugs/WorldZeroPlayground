/**
 * #1773 / ADR-0088 — the logged-out surfaces reach EVERY way in.
 *
 * Discord's backend leg shipped in #1772 and was unreachable from the UI:
 * `NavBar` and `Home` both called `loginWithGoogle()` directly. What is pinned
 * here is the thing that regressed once and would regress silently again —
 * that a provider added to the backend, or a careless edit to either entry
 * point, cannot leave a live route with no door pointing at it. Since
 * ADR-0088 the set is four: two redirect rides, a form lane, and the key lane.
 *
 * The framing assertion is #1738's surviving constraint: a provider is named on
 * the button that goes to it and NOWHERE else. "Sign in with Google" as a
 * heading is the wrong shape even while Google is the only provider that works.
 *
 * `drawAtRoot` renders inline with no `document` (the harness has none), which
 * is what makes the sheet's contents assertable at all. The MemoryRouter wrap
 * is the lanes' price of admission: a paused sign-in navigates to the gate,
 * so every option mounts with a router around it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const loginWith = vi.fn()
vi.mock('../../api/auth', () => ({
  loginWith: (p: string) => loginWith(p),
  atprotoLogin: vi.fn(),
  atprotoChallengeStart: vi.fn(),
  atprotoChallengeVerify: vi.fn(),
  keyChallenge: vi.fn(),
  keyVerify: vi.fn(),
  keyRegister: vi.fn(),
}))

import SignInOptions, { SignInSheet } from '../SignInOptions'

describe('SignInOptions', () => {
  it('offers every way in the backend serves a leg for (ADR-0088)', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SignInOptions />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-testid="sign-in-google"')
    expect(markup).toContain('data-testid="sign-in-discord"')
    expect(markup).toContain('data-testid="sign-in-atproto-go"')
    expect(markup).toContain('data-testid="sign-in-key-go"')
    expect(markup).toContain('Continue with Google')
    expect(markup).toContain('Continue with Discord')
    expect(markup).toContain('Continue with AT Proto')
    expect(markup).toContain('Continue with a public key')
  })

  it('gives no provider the visual primacy of being the default', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SignInOptions />
      </MemoryRouter>,
    )
    // class= on elements: the four doors only (lane switchers are plain
    // text buttons, door sharing the caller's class is the no-primacy law).
    const classes = [...markup.matchAll(/class="([^"]*)"/g)].map((m) => m[1])

    expect(classes).toHaveLength(4)
    expect(new Set(classes).size).toBe(1)
  })
})

describe('SignInSheet', () => {
  it('draws nothing until it is opened', () => {
    expect(renderToStaticMarkup(<SignInSheet open={false} onClose={() => {}} />)).toBe('')
  })

  it('opens every way in, under framing copy that names none (#1738)', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SignInSheet open onClose={() => {}} />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-testid="sign-in-google"')
    expect(markup).toContain('data-testid="sign-in-discord"')
    expect(markup).toContain('data-testid="sign-in-atproto"')
    expect(markup).toContain('data-testid="sign-in-key"')

    // The dialog's own title and label — everything that is not a button.
    const framing = markup.replace(/<button[\s\S]*?<\/button>/g, '')
    expect(framing).toContain('Somewhere to keep your score')
    expect(framing).not.toMatch(/Google|Discord|AT Proto|public key/)
  })

  it('is a labelled modal, not a bare div', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SignInSheet open onClose={() => {}} />
      </MemoryRouter>,
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
  })
})
